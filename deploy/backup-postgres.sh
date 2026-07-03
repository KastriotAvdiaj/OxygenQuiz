#!/usr/bin/env bash
# Nightly PostgreSQL backup for OxygenQuiz. Dumps the DB to a gzip file and prunes old ones.
#
# Install (on the server, once):
#   chmod +x /opt/oxygenquiz/deploy/backup-postgres.sh
#   sudo crontab -e
#   # add this line (runs daily at 03:00):
#   0 3 * * * /opt/oxygenquiz/deploy/backup-postgres.sh >> /var/log/oxygenquiz-backup.log 2>&1
#
# Tip: periodically copy /opt/oxygenquiz/backups off-box (e.g. to Cloudflare R2 / S3)
# so a lost server doesn't lose the backups too.

set -euo pipefail

DEPLOY_DIR=/opt/oxygenquiz/deploy
BACKUP_DIR=/opt/oxygenquiz/backups
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$BACKUP_DIR/oxygenquiz-$STAMP.sql.gz"

docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" exec -T postgres \
    pg_dump -U postgres OxygenQuiz | gzip > "$OUT"

# Prune backups older than the retention window.
find "$BACKUP_DIR" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "$(date -Is) backup complete: $OUT"
