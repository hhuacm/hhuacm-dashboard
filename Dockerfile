# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.13 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
RUN bun run --cwd apps/web build
RUN rm -rf node_modules apps/*/node_modules packages/*/node_modules \
  && bun install --production --frozen-lockfile

FROM oven/bun:1.3.13 AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --chown=bun:bun --from=build /app /app
USER bun
