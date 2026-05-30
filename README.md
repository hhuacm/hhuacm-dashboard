# HHUACM Dashboard

HHUACM Dashboard 是面向河海大学 ACM 队内部使用的成员与数据管理系统，用于整理队员基础信息、维护 OJ 账号、统计公开榜单、沉淀获奖记录，并承载后续队内事务管理能力。

项目当前仍以测试与快速演进为主，代码组织优先追求清晰、可读和容易继续调整。

## 技术栈

本项目是 Bun workspace monorepo，主要使用：

- Bun
- Turborepo
- Next.js
- Hono
- tRPC
- Drizzle ORM
- libSQL / Turso
- React
- Tailwind CSS v4
- HeroUI V3
- Better Auth
- React Hook Form
- Zod

## 目录结构

```text
apps/
  web/             前端应用，负责页面、交互和 UI 组件
  server/          HTTP API 服务，负责 Hono 入口、tRPC 接入和认证端点
  refresh-worker/  后台刷新进程，负责消费 OJ 数据刷新请求

packages/
  api/          tRPC router、procedure 和 HTTP 适配边界
  application/  应用服务、后台刷新用例、系统任务和外部 OJ 同步
  auth/         认证配置与认证相关逻辑
  db/           数据库 schema、迁移和本地数据库命令
  domain/       领域常量、枚举和纯业务规则
  env/          环境变量读取与校验
  config/       共享 TypeScript 配置
```

包边界采用受整洁架构 / 六边形架构启发的轻量形式：应用入口负责组装进程，API 负责 transport 适配，核心业务流程放在 `packages/application`，纯业务常量和规则放在 `packages/domain`。

## 本地开发

安装依赖：

```bash
bun install
```

启动完整开发环境：

```bash
bun run dev
```

默认服务与进程：

- Web 应用：[http://localhost:3001](http://localhost:3001)
- API 服务：[http://localhost:3000](http://localhost:3000)
- Refresh Worker：无 HTTP 端口，消费数据库中的刷新请求

也可以单独启动某一侧：

```bash
bun run dev:web
bun run dev:server
bun run dev:refresh-worker
```

各应用目录提供 `.env.example` 作为本地配置参考。Web 应用的浏览器端请求使用同源 `/trpc` 和 `/api/auth`，本地开发时由 Next.js rewrite 转发到 API 服务；如需覆盖这个内部地址，在 `apps/web/.env` 中配置：

```bash
SERVER_INTERNAL_URL=http://localhost:3000
```

## 数据库

本地开发使用 libSQL / Turso。需要本地数据库时，先安装 Turso CLI：

```bash
brew install tursodatabase/tap/turso
```

启动本地数据库服务：

```bash
bun run db:local
```

在 `apps/server/.env` 中配置 HTTP API、认证和数据库连接；在 `apps/refresh-worker/.env` 中只需要数据库连接：

```bash
DATABASE_URL=http://127.0.0.1:8080
DATABASE_AUTH_TOKEN=
```

生产部署时，Web 容器需要通过 `SERVER_INTERNAL_URL` 访问 API 容器，例如 `http://server:3000`；API 服务的 `BETTER_AUTH_URL` 和 `CORS_ORIGIN` 应指向用户访问的同一个站点域名。前端生产构建不需要公网 API URL。

当前刷新队列按单个 worker 实例设计。本地开发和部署时只应运行一个 `refresh-worker` 进程。

将当前 Drizzle schema 同步到数据库：

```bash
bun run db:sync
```

## 代码检查与测试

提交前运行完整验证：

```bash
bun run verify
```

它会自动修复可安全处理的格式和静态问题，然后执行类型检查、风格检查和全部测试。

需要拆开排查时，可以分别运行：

```bash
bun run check
bun run test
bun run fix
```

## 协作文档

- `AGENTS.md`：面向 AI / LLM 协作者的项目协作准则、架构取舍和编码要求。
- `DESIGN.md`：前端设计准则，描述产品气质、布局、颜色、组件和交互规则。
