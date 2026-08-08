# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.14 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
RUN bun run --cwd apps/web build

FROM build AS pruner
WORKDIR /source
COPY . .
RUN /app/node_modules/.bin/turbo prune refresh-worker --docker --out-dir /runtime

FROM oven/bun:1.3.14 AS runtime-deps
WORKDIR /app
COPY --from=pruner /runtime/json/ .
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.14 AS runtime
ARG APP_COMMITTED_AT
ARG APP_REVISION=local
WORKDIR /app
ENV APP_COMMITTED_AT=$APP_COMMITTED_AT APP_REVISION=$APP_REVISION NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --chown=bun:bun --from=build /app/apps/web/.next/standalone/node_modules /app/node_modules
COPY --chown=bun:bun --from=build /app/apps/web/.next/standalone/apps/web /app/apps/web
COPY --chown=bun:bun --from=build /app/apps/web/.next/static /app/apps/web/.next/static
COPY --chown=bun:bun --from=build /app/apps/web/public /app/apps/web/public
COPY --chown=bun:bun --from=runtime-deps /app /app/runtime
COPY --chown=bun:bun --from=pruner /runtime/full /app/runtime
USER bun
