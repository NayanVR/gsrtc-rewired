#!/usr/bin/env bash

set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

: "${BACKUP_RCLONE_REMOTE:?Set BACKUP_RCLONE_REMOTE in the scheduled job environment.}"

for command in docker rclone; do
	if ! command -v "$command" >/dev/null 2>&1; then
		echo "Required command is not installed: $command" >&2
		exit 1
	fi
done

timestamp="$(date -u +%Y-%m-%dT%H%M%SZ)"
backup_name="gsrtc-rewired-${timestamp}.dump"
backup_target="${BACKUP_RCLONE_REMOTE%/}/${backup_name}"

docker compose exec -T db sh -ceu '
	PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump \
		--host=localhost \
		--port=5432 \
		--username="$POSTGRES_USER" \
		--dbname="$POSTGRES_DB" \
		--format=custom
' | rclone rcat "$backup_target"

echo "Backup uploaded to $backup_target"
