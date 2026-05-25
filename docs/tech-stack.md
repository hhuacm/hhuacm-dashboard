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

## Architecture

The repository is split into applications and shared packages:

```text
hhuacm-dashboard/
|-- apps/
|   |-- web/         # Next.js frontend application
|   |-- server/      # Hono API server
|-- packages/
    |-- api/         # tRPC routers, procedures, and API context
    |-- auth/        # Better Auth configuration
    |-- config/      # Shared TypeScript configuration
    |-- db/          # Drizzle database client and schema
    |-- domain/      # Shared domain constants, labels, and pure business rules
    |-- env/         # Runtime environment validation
```

The main request flow is:

```text
Next.js app -> TanStack Query -> tRPC client -> Hono /trpc -> tRPC router
```

Authentication uses Better Auth HTTP endpoints mounted under `Hono /api/auth/*`. The frontend also calls the `health` tRPC procedure to verify the web app and API server are connected.

Some read procedures use a read-through refresh pattern: they return cached data immediately and enqueue background refresh requests when cached OJ data or problem metadata is missing or stale. This keeps pages responsive while making the side effect explicit in the service layer.

## Local Services

- Web app: `http://localhost:3001`
- API server: `http://localhost:3000`
- tRPC endpoint: `http://localhost:3000/trpc`
- Auth endpoint: `http://localhost:3000/api/auth`
- Local libSQL server: `http://127.0.0.1:8080`

The web app reads `NEXT_PUBLIC_SERVER_URL` from `apps/web/.env`. The server reads `CORS_ORIGIN`, `BETTER_AUTH_URL`, `DATABASE_URL`, and `DATABASE_AUTH_TOKEN` from `apps/server/.env`. For local `turso dev`, use `DATABASE_URL=http://127.0.0.1:8080` and leave `DATABASE_AUTH_TOKEN` empty.

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

Push schema changes:

```bash
bun run db:push
```

Generate migrations:

```bash
bun run db:generate
```

Run migrations:

```bash
bun run db:migrate
```

Open Drizzle Studio:

```bash
bun run db:studio
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

HeroUI V3 currently does not provide a Dialog/Modal component in this project, so login and registration are implemented as dedicated `/login` and `/register` pages using `Card + Form` composition.
