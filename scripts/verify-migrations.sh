#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage: bash scripts/verify-migrations.sh

Replays the complete Prisma migration chain against a disposable MySQL Docker
container, then verifies that Prisma reports no pending migrations.

Optional environment variables:
  MYSQL_IMAGE       Docker image to use (default: mysql:8.4)
  MYSQL_READY_TIMEOUT_SECONDS
                    Startup timeout in seconds (default: 90)
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 0 ]]; then
  echo "Error: unexpected arguments. Run with --help for usage." >&2
  exit 64
fi

for command_name in docker node npx; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Error: required command '$command_name' is not installed or not on PATH." >&2
    exit 127
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker is installed, but the Docker daemon is not available." >&2
  exit 1
fi

mysql_image="${MYSQL_IMAGE:-mysql:8.4}"
ready_timeout="${MYSQL_READY_TIMEOUT_SECONDS:-90}"
if [[ ! "$ready_timeout" =~ ^[1-9][0-9]*$ ]]; then
  echo "Error: MYSQL_READY_TIMEOUT_SECONDS must be a positive integer." >&2
  exit 64
fi

container_name="fintrack-migration-verify-${$}-${RANDOM}"
database_name="fintrack_migration_verify"
database_user="fintrack_verify"
database_password="verify${RANDOM}${RANDOM}${RANDOM}"
root_password="root${RANDOM}${RANDOM}${RANDOM}"
container_created=false

cleanup() {
  if [[ "$container_created" == true ]]; then
    docker rm --force "$container_name" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Starting disposable MySQL container using ${mysql_image}..."
if ! docker run --detach --rm \
  --name "$container_name" \
  --publish 127.0.0.1::3306 \
  --env "MYSQL_DATABASE=${database_name}" \
  --env "MYSQL_USER=${database_user}" \
  --env "MYSQL_PASSWORD=${database_password}" \
  --env "MYSQL_ROOT_PASSWORD=${root_password}" \
  "$mysql_image" >/dev/null; then
  echo "Error: failed to start the disposable MySQL container." >&2
  exit 1
fi
container_created=true

echo "Waiting for MySQL to accept connections (timeout: ${ready_timeout}s)..."
deadline=$((SECONDS + ready_timeout))
until docker exec --env "MYSQL_PWD=${root_password}" "$container_name" \
  mysqladmin ping --host=127.0.0.1 --user=root --silent >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "Error: MySQL did not become ready within ${ready_timeout} seconds." >&2
    docker logs --tail 50 "$container_name" >&2 || true
    exit 1
  fi
  sleep 2
done

# The historical account backfill predates MySQL 8.4's stricter
# only_full_group_by default. Relax this setting only inside the disposable
# verification container; never change a persistent application database.
docker exec --env "MYSQL_PWD=${root_password}" "$container_name" \
  mysql --host=127.0.0.1 --user=root --database=mysql --execute \
  "SET GLOBAL sql_mode = REPLACE(@@GLOBAL.sql_mode, 'ONLY_FULL_GROUP_BY', '')" >/dev/null

published_address="$(docker port "$container_name" 3306/tcp | head -n 1)"
published_port="${published_address##*:}"
if [[ ! "$published_port" =~ ^[0-9]+$ ]]; then
  echo "Error: could not determine the disposable MySQL host port." >&2
  exit 1
fi

export DATABASE_URL="mysql://${database_user}:${database_password}@127.0.0.1:${published_port}/${database_name}"

echo "Applying the complete migration chain to the empty database..."
if ! npx --no-install prisma migrate deploy; then
  echo "Error: Prisma migration replay failed." >&2
  exit 1
fi

echo "Checking migration status..."
if ! npx --no-install prisma migrate status; then
  echo "Error: Prisma reported a pending or failed migration." >&2
  exit 1
fi

echo "Migration replay verified successfully. The disposable database will now be removed."
