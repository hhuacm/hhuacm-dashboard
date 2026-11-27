#!/bin/sh
set -eu

# Run from the VPS directory containing compose.yaml and .env.
exec 9<.
flock -n 9 || { echo 'Could not acquire the deployment lock.' >&2; exit 1; }
docker compose pull
image=$(docker compose config --images | sort -u)
target=$(docker image inspect --format '{{.Id}}' "$image")
needs_update=false
for service in web refresh-worker; do
  container=$(docker compose ps -aq "$service")
  if [ -z "$container" ]; then
    needs_update=true
    break
  fi
  current=$(docker inspect --format '{{.Image}} {{.State.Running}}' "$container")
  if [ "$current" != "$target true" ]; then
    needs_update=true
    break
  fi
done

if [ "$needs_update" = false ]; then
  echo 'Application is already running the pulled image.'
  exit 0
fi

# Old application processes must not write while the schema changes.
docker compose stop web refresh-worker
docker compose run --rm --no-deps -T web bun run --cwd runtime db:sync
docker compose up -d --no-build --pull never web refresh-worker
docker compose ps
