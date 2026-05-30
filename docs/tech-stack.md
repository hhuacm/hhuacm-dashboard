# Technical Stack

This project was scaffolded with Better-T-Stack and uses a TypeScript monorepo architecture. The scaffold choices are recorded in `bts.jsonc`, including the reproducible creation command.

## Stack

- **Runtime and package manager:** Bun
- **Frontend:** Next.js with React, App Router, typed routes, and React Compiler
- **Backend:** Hono running as a separate API server
- **API layer:** tRPC for end-to-end typed client/server procedures
- **Database:** SQLite-compatible libSQL/Turso
- **ORM:** Drizzle ORM and Drizzle Kit
- **Authentication:** Better Auth with email or username sign-in for local accounts
- **Styling:** Tailwind CSS v4 with app-level theme CSS in `apps/web`
- **UI primitives:** HeroUI V3 components imported from `@heroui/react`
- **Client data fetching:** TanStack Query with tRPC
- **Forms and validation:** React Hook Form and Zod
- **Monorepo tooling:** Bun workspaces and Turborepo
- **Code quality:** Ultracite/Biome and Lefthook

## TypeScript Baseline

Shared packages and the API/server workspaces use the shared TypeScript base config from `packages/config`. The project is written as modern ESM TypeScript with `strict`, `isolatedModules`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`, and `noUncheckedIndexedAccess` enabled.

The preferred style is to keep runtime facts in plain constants and derive types from them. Use `as const`, `satisfies`, `import type`, Zod schemas, and domain guards to keep boundaries explicit while letting local implementation details rely on inference. Avoid TypeScript-only runtime constructs or deep generic type machinery unless they clearly make the surrounding business flow easier to read.

## Architecture

The repository is split into applications and shared packages:

```text
hhuacm-dashboard/
|-- apps/
|   |-- web/             # Next.js frontend application
|   |-- server/          # Hono API server
|   |-- refresh-worker/  # Background refresh worker process
|-- packages/
    |-- api/          # tRPC routers, procedures, and API context
    |-- application/  # Application services, refresh use cases, system tasks, and OJ sync
    |-- auth/         # Better Auth configuration
    |-- config/       # Shared TypeScript configuration
    |-- db/           # Drizzle database client and schema
    |-- domain/       # Shared domain constants, labels, and pure business rules
    |-- env/          # Runtime environment validation
```

The main browser request flow is:

```text
Next.js app -> TanStack Query -> same-origin /trpc -> Hono /trpc -> tRPC router
```

The package boundaries are lightly inspired by clean and hexagonal architecture. `apps/*` act as process entrypoints and runtime composition roots, `packages/api` adapts HTTP/tRPC transport to use cases, `packages/application` owns application use cases and background workflows, and `packages/domain` keeps pure domain facts. Infrastructure packages such as `db`, `auth`, and `env` remain explicit dependencies at the edges instead of becoming hidden global context.

Authentication uses Better Auth HTTP endpoints mounted under `Hono /api/auth/*`. The frontend also calls the `health` tRPC procedure to verify the web app and API server are connected.

Some read procedures use a read-through refresh pattern: they return cached data immediately and enqueue background refresh requests when cached OJ data or problem metadata is missing or stale. The application package owns those refresh use cases, and the `refresh-worker` process consumes requests from the database queue. This keeps pages responsive while keeping HTTP transport concerns in the API package.

## Local Services

- Web app: `http://localhost:3001`
- API server: `http://localhost:3000`
- Browser tRPC endpoint: `/trpc`
- Browser auth endpoint: `/api/auth`
- API server tRPC endpoint: `http://localhost:3000/trpc`
- API server auth endpoint: `http://localhost:3000/api/auth`
- Refresh worker: background process with no HTTP port
- Local libSQL server: `http://127.0.0.1:8080`

Browser-side web requests use same-origin paths so the production build is not tied to a public API URL. In local development, Next.js rewrites `/trpc/*` and `/api/auth/*` to `SERVER_INTERNAL_URL`, which defaults to `http://localhost:3000` in the web environment module. Production routing should be handled by the deployment proxy, while server-rendered web routes use `SERVER_INTERNAL_URL` for container-internal API calls and require it in production. Each app directory includes a `.env.example` file for the variables it reads. The refresh queue currently assumes a single worker instance.

Production environment variables by process:

```text
web:
  NODE_ENV=production
  PORT=3000
  SERVER_INTERNAL_URL=http://server:3000

server:
  NODE_ENV=production
  PORT=3000
  DATABASE_URL=...
  DATABASE_AUTH_TOKEN=...
  BETTER_AUTH_SECRET=...
  BETTER_AUTH_URL=https://dashboard.example.com
  CORS_ORIGIN=https://dashboard.example.com

refresh-worker:
  DATABASE_URL=...
  DATABASE_AUTH_TOKEN=...
```

For local `turso dev`, use `DATABASE_URL=http://127.0.0.1:8080` and leave `DATABASE_AUTH_TOKEN` empty.

## Docker Layout

The Docker deployment uses one application image with different commands per process:

```text
web            ghcr.io/hhuacm/hhuacm-dashboard image, bun run --cwd apps/web start
server         ghcr.io/hhuacm/hhuacm-dashboard image, bun run --cwd apps/server start
refresh-worker ghcr.io/hhuacm/hhuacm-dashboard image, bun run --cwd apps/refresh-worker start
```

Compose starts web, server, and refresh-worker from `ghcr.io/hhuacm/hhuacm-dashboard:${IMAGE_TAG:-main}`, and binds `web` and `server` to `127.0.0.1` on the Docker host so an existing host Nginx or 1Panel reverse proxy can route public traffic. Host Nginx should route `/trpc/*` and `/api/auth/*` to the server port and all other paths to the web port. The web container uses `SERVER_INTERNAL_URL=http://server:3000` for server-rendered tRPC calls. The refresh worker should still only have one running instance across the whole deployment.

## Common Scripts

Run all apps in development mode:

```bash
bun run dev
```

Run only the web app:

```bash
bun run dev:web
```

Run only the API server:

```bash
bun run dev:server
```

Run only the refresh worker:

```bash
bun run dev:refresh-worker
```

Build all workspaces:

```bash
bun run build
```

Check TypeScript for workspaces that define a `check-types` script:

```bash
bun run check-types
```

Run Ultracite/Biome checks:

```bash
bun run check
```

Apply Ultracite/Biome fixes:

```bash
bun run fix
```

## Database Scripts

Install the Turso CLI on macOS:

```bash
brew install tursodatabase/tap/turso
```

Start a local Turso/libSQL database:

```bash
bun run db:local
```

Synchronize the database with the Drizzle schema:

```bash
bun run db:sync
```

## UI and Theme

The web app uses HeroUI V3 React components directly from `@heroui/react`. Global Tailwind and HeroUI theme CSS live in the web app because there is currently only one frontend.

- Design tokens and global styles: `apps/web/src/index.css`
- HeroUI styles import: `@import "@heroui/styles";`
- Application CSS entry: `apps/web/src/index.css`

Use HeroUI compound components in application code:

```tsx
import { Button, Card, Form, Input, Label, TextField } from "@heroui/react";

export function ExampleForm() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Example</Card.Title>
      </Card.Header>
      <Form>
        <Card.Content>
          <TextField name="name">
            <Label>Name</Label>
            <Input />
          </TextField>
        </Card.Content>
        <Card.Footer>
          <Button type="submit">Save</Button>
        </Card.Footer>
      </Form>
    </Card>
  );
}
```

When adding or changing UI, use the HeroUI MCP or official documentation for V3 component APIs and BEM class names. Keep custom styling on top of HeroUI semantic tokens such as `background`, `foreground`, `surface`, `accent`, `success`, `warning`, `danger`, `field-*`, `border`, and `focus`.

Dialogs and destructive confirmations use HeroUI V3 components such as `Modal` and `AlertDialog`. Login and registration remain dedicated `/login` and `/register` pages because they are primary entry flows rather than transient dialogs.
