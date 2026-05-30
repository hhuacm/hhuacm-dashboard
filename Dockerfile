# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.13 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY . .
RUN bun install --frozen-lockfile

FROM deps AS build
ENV NODE_ENV=production
RUN bun run --cwd apps/web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
