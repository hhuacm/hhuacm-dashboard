# 项目协作准则

这份文档随仓库保存，应当能够独立作为 HHUACM Dashboard 的协作依据。它只保留会长期影响项目判断的设计取向、重大架构选择和运行约束；能够从代码直接看出的实现细节不在这里重复。

## 设计取向

- 按内聚关系和共同变化组织代码，让项目呈现清楚的系统模型；不因文件长度、目录对称或架构名词机械拆分。
- 优先用不变量、约束、定义表和可推导关系消除状态与分支，相同事实只定义一次，并明确呈现重要依赖、控制流和失败路径。
- 只抽取真实稳定的共性，不为未来需求增加转发层、扩展点、依赖、配置或兼容逻辑。迁移成本可控时，积极修正已经错位的结构。
- 性能满足现实约束后，优先选择容易理解、验证和修改的实现。代码、文档和界面追求清楚、可靠、克制和完整。

## 产品与信任边界

HHUACM Dashboard 面向河海大学 ACM 队的成员管理、训练数据和队内事务。项目仍在测试和演进，但成员身份、权限、个人资料和外部 OJ 数据都是真实数据，不能弱化访问控制、失败处理或数据完整性。

公开页面和 `publicProcedure` 是明确的信任边界。涉及邮箱、学号、真实姓名等成员信息时，应单独确认可见范围，不能直接复用数据库行或后台详情对象。管理操作使用 `adminProcedure`，个人设置使用 `protectedProcedure`；外部 OJ 响应在进入系统时完成校验。

## 架构取舍

```text
Browser -> Next.js -> Hono / tRPC -> packages/api
        -> packages/application -> packages/db

application read use case -> refresh_request
refresh-worker -> application refresh job -> external OJ -> cached database state
```

`apps/*` 负责进程入口和运行时组装；`packages/api` 适配 transport；`packages/application` 承载应用用例、后台刷新和外部 OJ 同步；`packages/domain` 保存无基础设施依赖的业务事实；`packages/db`、`auth`、`env` 提供基础设施能力。`packages/application` 不应反向依赖 API 或应用入口。

`packages/application` 直接使用 Drizzle `Database` 和 schema，并通过临时 libSQL 数据库测试用例。这是有意的轻量选择：除非出现第二种真实持久化适配器，或数据库耦合已经明显阻碍测试和修改，否则不要增加 repository、port 或逐表转发层。

刷新队列当前只支持一个 worker 实例。页面读取本地缓存，缺失或过期的数据由后台任务刷新，不应阻塞页面等待外部 OJ。

## 前端与文档

前端遵循 [`DESIGN.md`](DESIGN.md)，优先使用现有 HeroUI V3 模式，并真实呈现加载、错误、空状态、保存中和删除确认。`README.md` 负责项目入口，`docs/tech-stack.md` 负责技术基线，`docs/vps-deployment.md` 负责生产部署；同一操作事实尽量只在一个位置完整说明。

## 常用命令

首次运行或依赖变化时执行 `bun install`。开发与数据库命令：

```bash
bun run db:local
bun run db:sync
bun run dev
```

完成修改后运行：

```bash
bun run verify
```

`verify` 会先自动修复，再检查数据库迁移、TypeScript、代码风格和全部测试。自动修复后应复核 diff。
