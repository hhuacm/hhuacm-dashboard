# hhuacm-dashboard

HHUACM Dashboard 项目主要用于河海大学 ACM 队校内成员信息统计管理、OJ 信息查询统计、奖项整理等队内事务。

## Development

Install dependencies:

```bash
bun install
```

Start the full development stack:

```bash
bun run dev
```

By default, the web app runs at [http://localhost:3001](http://localhost:3001) and the API server runs at [http://localhost:3000](http://localhost:3000).

## Database

Start a local Turso/libSQL database when needed:

```bash
bun run db:local
```

Apply the current Drizzle schema:

```bash
bun run db:push
```
