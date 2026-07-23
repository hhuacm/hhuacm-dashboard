# HHUACM Dashboard

HHUACM Dashboard 是面向河海大学 ACM 队的成员与数据管理系统，用于维护成员资料与 OJ 账号、展示公开榜单和个人主页、管理训练题单，并在后台同步外部 OJ 数据与获奖记录。

项目目前处于持续测试和快速演进阶段，优先保证业务流程清楚、数据状态可靠，并让后续修改容易定位和验证。

## 系统概览

仓库采用 Bun workspace monorepo。常规请求与后台刷新分别沿两条主流程运行：

```text
Browser
  -> Next.js Web
  -> Hono / tRPC
  -> application use case
  -> libSQL / Turso

application read use case
  -> refresh_request queue
  -> refresh-worker
  -> external OJ source
  -> cached stats in libSQL / Turso
```

页面读取本地缓存；当 OJ 数据或题目元数据缺失、过期时，应用用例只写入刷新请求，由独立 worker 完成外部请求和缓存更新。当前队列按单个 worker 实例设计。

主要技术包括 Bun、Turborepo、Next.js、React、Hono、tRPC、Drizzle ORM、libSQL / Turso、Better Auth、Tailwind CSS v4、HeroUI V3、React Hook Form 和 Zod。

## 仓库结构

```text
apps/
  web/             Next.js 页面、交互与 UI
  server/          Hono 进程入口、tRPC 与认证端点
  refresh-worker/  后台刷新进程

packages/
  api/          tRPC router、procedure 与 transport 适配
  application/  应用用例、后台刷新、系统任务与外部 OJ 同步
  auth/         Better Auth 配置与首位管理员初始化
  db/           Drizzle schema、迁移、数据库连接与测试数据库
  domain/       共享业务事实、枚举与纯规则
  env/          环境变量读取与校验
```

`apps/*` 负责进程入口和运行时组装，`packages/api` 负责 transport 语义，主要业务流程位于 `packages/application`。`packages/application` 当前直接接收 Drizzle `Database` 并使用 schema；测试通过本地 libSQL 数据库跨这一接口验证行为，因此没有额外的 repository 抽象。

## 本地开发

需要 Bun（版本以 `package.json` 的 `packageManager` 为准）和 Turso CLI。macOS 可使用 Homebrew 安装 Turso CLI：

```bash
brew install tursodatabase/tap/turso
```

安装依赖并准备各进程的本地环境变量：

```bash
bun install
cp apps/server/.env.example apps/server/.env
cp apps/refresh-worker/.env.example apps/refresh-worker/.env
```

`apps/web/.env` 通常不需要创建；本地开发默认把服务端请求转发到 `http://localhost:3000`。需要覆盖时，再复制 `apps/web/.env.example` 并修改 `SERVER_INTERNAL_URL`。

在一个终端启动本地 libSQL 服务：

```bash
bun run db:local
```

首次启动或数据库结构变化后，在另一个终端同步数据库：

```bash
bun run db:sync
```

随后启动 Web、API 和刷新 worker：

```bash
bun run dev
```

默认地址：

- Web：<http://localhost:3001>
- API：<http://localhost:3000>
- 本地 libSQL：<http://127.0.0.1:8080>

浏览器使用同源 `/trpc` 和 `/api/auth`；本地由 Next.js rewrite 转发到 API。也可以只启动某个进程：

```bash
bun run dev:web
bun run dev:server
bun run dev:refresh-worker
```

`db:sync` 会识别空库、已纳入迁移管理的数据库，以及与初始基线兼容的既有数据库；随后执行 Drizzle 迁移，并检查数据库完整性、外键和视图。

## 验证

提交前运行完整验证：

```bash
bun run verify
```

该命令会先执行 Ultracite 自动修复，再检查数据库迁移、TypeScript、代码风格和全部测试。定位问题时可拆开运行：

```bash
bun run fix
bun run check
bun run test
```

## 部署

仓库提供统一应用镜像和 Compose 编排。默认启动 Web、API 与刷新 worker，并将 Web/API 绑定到宿主机 `127.0.0.1`，供 Nginx 或 1Panel 反向代理接入。

```bash
cp .env.example .env
docker compose pull
docker compose run --rm server bun dist/db-sync.js
docker compose up -d --no-build
```

生产环境还需注意：

- `BETTER_AUTH_URL` 与 `CORS_ORIGIN` 应使用用户访问的同一站点 origin。
- Web 容器通过 `SERVER_INTERNAL_URL` 访问 API 容器，例如 `http://server:3000`。
- 同一数据库只运行一个 `refresh-worker`。
- 空数据库中的第一个成功注册用户会成为管理员；部署前应确认注册策略和公开页面的成员字段可见范围符合实际需求。

完整流程见 [`docs/vps-deployment.md`](docs/vps-deployment.md)。

## 项目文档

- [`AGENTS.md`](AGENTS.md)：项目特有的协作规则、系统模型和架构约束。
- [`DESIGN.md`](DESIGN.md)：前端产品气质、布局、颜色、组件和交互规则。
- [`docs/tech-stack.md`](docs/tech-stack.md)：技术栈、运行时拓扑和 TypeScript 基线。
- [`docs/vps-deployment.md`](docs/vps-deployment.md)：VPS、Turso、Compose 与 Nginx 部署流程。
