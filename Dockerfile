# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.13 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN bun install --frozen-lockfile
ENV NODE_ENV=production
RUN bun run --cwd apps/web build
# libsql chooses its native addon at runtime, so Bun cannot include it in the bundle.
RUN bun build apps/server/src/index.ts --target=bun --outfile dist/server.js \
  && bun build apps/refresh-worker/src/index.ts --target=bun --outfile dist/refresh-worker.js \
  && bun build packages/db/src/cli/db-sync.ts --target=bun --outfile dist/db-sync.js \
  && bun build packages/application/src/system/cli/set-user-role.ts --target=bun --outfile dist/set-user-role.js \
  && bun build packages/application/src/system/cli/import-users.ts --target=bun --outfile dist/import-users.js \
  && mkdir -p runtime-node-modules/@libsql \
  && cp -RL node_modules/.bun/@libsql+linux-x64-gnu@*/node_modules/@libsql/linux-x64-gnu runtime-node-modules/@libsql/

FROM oven/bun:1.3.13 AS runtime
ARG APP_COMMITTED_AT
ARG APP_REVISION=local
WORKDIR /app
ENV APP_COMMITTED_AT=$APP_COMMITTED_AT APP_REVISION=$APP_REVISION NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --chown=bun:bun --from=build /app/apps/web/.next/standalone/node_modules /app/node_modules
COPY --chown=bun:bun --from=build /app/runtime-node-modules /app/node_modules
COPY --chown=bun:bun --from=build /app/apps/web/.next/standalone/apps/web /app/apps/web
COPY --chown=bun:bun --from=build /app/apps/web/.next/static /app/apps/web/.next/static
COPY --chown=bun:bun --from=build /app/apps/web/public /app/apps/web/public
COPY --chown=bun:bun --from=build /app/packages/db/src/migrations /app/dist/migrations
COPY --chown=bun:bun --from=build /app/dist /app/dist
USER bun
