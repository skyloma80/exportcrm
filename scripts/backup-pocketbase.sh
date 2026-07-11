#!/bin/bash
# PocketBase 自动备份脚本
# 用法: ./scripts/backup-pocketbase.sh [保留天数]
# 默认保留 7 天

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/exportcrm/backups}"
RETENTION_DAYS="${1:-7}"
PB_CONTAINER="${PB_CONTAINER:-pb}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="pb_backup_${TIMESTAMP}.zip"

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting PocketBase backup..."

# 执行备份
docker exec "$PB_CONTAINER" ./pocketbase backup "$BACKUP_DIR/$BACKUP_NAME"

if [ $? -eq 0 ]; then
    echo "[$(date)] Backup created: $BACKUP_DIR/$BACKUP_NAME"
else
    echo "[$(date)] ERROR: Backup failed!" >&2
    exit 1
fi

# 清理过期备份
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "pb_backup_*.zip" -mtime +"$RETENTION_DAYS" -delete -print | \
    while read f; do echo "[$(date)] Deleted: $f"; done

# 显示当前备份列表
echo "[$(date)] Current backups:"
ls -lh "$BACKUP_DIR"/pb_backup_*.zip 2>/dev/null || echo "  (none)"
echo "[$(date)] Backup complete."
