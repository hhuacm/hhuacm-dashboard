# VPS Docker Deployment

本文描述 HHUACM Dashboard 使用 GHCR 镜像部署到 VPS 的流程。这里假设镜像已经由 GitHub Actions 构建并推送到：

```text
ghcr.io/hhuacm/hhuacm-dashboard
```

VPS 不负责构建镜像，只负责保存 `compose.yaml`、`.env`，拉取镜像并运行容器。公开流量由宿主机已有的 Nginx 或 1Panel 反向代理接入。

## 部署形态

生产部署包含三个容器：

```text
web             Next.js 生产服务，监听容器内 3000
server          Hono / tRPC / Better Auth API，监听容器内 3000
refresh-worker  后台刷新进程，无公开 HTTP 端口
```

默认宿主机端口：

```text
127.0.0.1:3001 -> web:3000
127.0.0.1:3000 -> server:3000
```

外部访问链路：

```text
Browser
  -> HTTPS / Nginx
  -> /trpc 和 /api/auth 转发到 127.0.0.1:3000
  -> 其他路径转发到 127.0.0.1:3001
```

Web 容器内的服务端渲染请求不会绕公网域名，而是通过 Compose 网络访问：

```text
SERVER_INTERNAL_URL=http://server:3000
```

## 前置条件

VPS 需要准备：

- Docker Engine 和 Docker Compose
- 一份 `compose.yaml`
- 一份生产 `.env`
- 一个已发布的 GHCR 镜像 tag，例如 `main`、`latest`、`sha-xxxx`
- 一个远程 Turso 数据库 URL 和 token
- 宿主机 Nginx 反向代理

如果 GHCR 包是 public，VPS 不需要登录 GHCR。如果包是 private，需要先在 VPS 上登录：

```bash
docker login ghcr.io
```

用户名使用有读取包权限的 GitHub 用户名，密码使用带 `read:packages` 权限的 GitHub token。

## 创建 Turso 数据库

第一次上线建议从一个空 Turso 数据库开始，不要把本地测试库整库导入生产。

在本机或任意已安装 Turso CLI 的环境中登录：

```bash
turso auth login
```

创建生产数据库：

```bash
turso db create hhuacm-dashboard
```

获取数据库 URL：

```bash
turso db show hhuacm-dashboard --url
```

创建数据库 token：

```bash
turso db tokens create hhuacm-dashboard
```

把 URL 和 token 写入 VPS 的 `.env`，不要提交到 Git 仓库。

## 编写 VPS 环境变量

在 VPS 的部署目录中创建 `.env`：

```bash
cp .env.example .env
```

生产环境至少需要调整这些值：

```env
IMAGE_TAG=main

WEB_HOST=127.0.0.1
WEB_PORT=3001
SERVER_HOST=127.0.0.1
SERVER_PORT=3000

DATABASE_URL=libsql://...
DATABASE_AUTH_TOKEN=...

BETTER_AUTH_SECRET=replace-with-a-random-secret-of-at-least-32-chars
BETTER_AUTH_URL=https://dashboard.example.com
CORS_ORIGIN=https://dashboard.example.com
```

`BETTER_AUTH_SECRET` 必须长期稳定。可以在 VPS 上生成：

```bash
openssl rand -base64 48
```

`BETTER_AUTH_URL` 和 `CORS_ORIGIN` 应填写用户实际访问的同一个公网 origin，包含协议，不带路径：

```text
https://dashboard.example.com
```

建议限制 `.env` 权限：

```bash
chmod 600 .env
```

## 初始化数据库结构

先拉取镜像：

```bash
docker compose pull
```

第一次启动应用前，使用镜像内的项目命令同步数据库 schema：

```bash
docker compose run --rm server bun run --cwd packages/db db:sync
```

这条命令会读取 Compose 注入给 `server` 服务的 `DATABASE_URL` 和 `DATABASE_AUTH_TOKEN`，把当前 Drizzle schema 推送到 Turso，并执行完整性检查。

当前项目使用的是 `drizzle-kit push` 形态，不是迁移文件逐条回放形态。因此生产库初始化应以空库加 `db:sync` 为主。已有生产数据后，执行结构变更前应先确认变更内容并做好备份。

## 启动容器

数据库结构初始化完成后启动服务：

```bash
docker compose up -d --no-build
```

`--no-build` 用来明确 VPS 只运行远程镜像，不在服务器本地构建。

查看状态：

```bash
docker compose ps
docker compose logs --tail=100
```

`refresh-worker` 当前按单实例设计。生产环境中只应有一个刷新 worker 在消费同一套数据库刷新队列。

## 配置 Nginx

宿主机 Nginx 可以按路径分流：

```nginx
location ^~ /trpc {
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://127.0.0.1:3000;
}

location ^~ /api/auth {
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://127.0.0.1:3000;
}

location / {
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_pass http://127.0.0.1:3001;
}
```

如果使用 1Panel 管理 Nginx，保持同样的路径转发关系即可：

```text
/trpc     -> http://127.0.0.1:3000
/api/auth -> http://127.0.0.1:3000
/         -> http://127.0.0.1:3001
```

## 创建首个管理员

空数据库初始化后，第一个成功注册的用户会自动成为管理员。流程是：

1. 访问线上 `/register`。
2. 注册第一个账号。
3. 登录后进入后台页面确认管理员权限。

这个规则只用于空库 bootstrap。数据库中已有用户后，新注册用户仍然是普通 `user`。

如果需要手动修复权限，可以在 VPS 上执行：

```bash
docker compose run --rm server bun run system:grant-admin -- --username <username>
```

撤销管理员：

```bash
docker compose run --rm server bun run system:revoke-admin -- --username <username>
```

## 更新版本

GitHub Actions 发布新镜像后，VPS 更新流程：

```bash
docker compose pull
docker compose run --rm server bun run --cwd packages/db db:sync
docker compose up -d --no-build
```

如果需要锁定版本或回滚，在 `.env` 中修改：

```env
IMAGE_TAG=sha-xxxx
```

然后重新执行：

```bash
docker compose pull
docker compose up -d --no-build
```

## 常用排查

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f web
docker compose logs -f server
docker compose logs -f refresh-worker
```

确认宿主机本地端口可访问：

```bash
curl -I http://127.0.0.1:3001
curl -I http://127.0.0.1:3000
```

常见问题：

- `DATABASE_URL is required`：VPS `.env` 没有被 Compose 读取，或变量为空。
- `BETTER_AUTH_SECRET` 校验失败：生产 secret 少于 32 个字符。
- 登录后状态异常：确认 `BETTER_AUTH_URL`、`CORS_ORIGIN` 和公网域名一致，并确认 Nginx 走 HTTPS。
- 浏览器页面能打开但 tRPC/auth 失败：检查 Nginx 是否把 `/trpc` 和 `/api/auth` 转发到了 `SERVER_PORT`。
- 数据刷新没有变化：确认只有一个 `refresh-worker` 在运行，并查看 worker 日志。
