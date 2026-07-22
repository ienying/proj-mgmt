#!/bin/bash
set -Eeuo pipefail

# ============================================
# 数据库备份脚本
# 用法:
#   ./scripts/backup-db.sh              # 备份到默认目录
#   ./scripts/backup-db.sh --list       # 列出已有备份
#   ./scripts/backup-db.sh --restore N  # 恢复第 N 个备份（N 为 --list 中的编号）
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"
CONTAINER="proj-mgmt-db"
DB_USER="${PG_USER:-projmgmt}"
DB_NAME="${PG_DB:-projmgmt}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/projmgmt_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# 保留最近 30 个备份，自动清理旧的
rotate_backups() {
  local keep=${1:-30}
  local files=($(ls -1t "$BACKUP_DIR"/projmgmt_*.sql.gz 2>/dev/null))
  local count=${#files[@]}
  if [ "$count" -gt "$keep" ]; then
    for ((i=keep; i<count; i++)); do
      echo "  清理旧备份: $(basename "${files[$i]}")"
      rm -f "${files[$i]}"
    done
  fi
}

case "${1:-}" in
  --list)
    echo "============================================"
    echo "  备份列表: $BACKUP_DIR"
    echo "============================================"
    ls -1th "$BACKUP_DIR"/projmgmt_*.sql.gz 2>/dev/null | nl -w2 -s'. ' || echo "  (暂无备份)"
    ;;
  --restore)
    if [ -z "${2:-}" ]; then
      echo "用法: $0 --restore <编号>"
      echo "先用 $0 --list 查看备份列表"
      exit 1
    fi
    RESTORE_FILE=$(ls -1t "$BACKUP_DIR"/projmgmt_*.sql.gz 2>/dev/null | sed -n "${2}p")
    if [ -z "$RESTORE_FILE" ]; then
      echo "错误: 编号 $2 的备份不存在"
      exit 1
    fi
    echo "============================================"
    echo "  恢复备份: $(basename "$RESTORE_FILE")"
    echo "  ⚠️  这将覆盖当前数据库中的所有数据！"
    echo "============================================"
    read -p "确认恢复？输入 yes 继续: " confirm
    if [ "$confirm" != "yes" ]; then
      echo "已取消"
      exit 0
    fi
    echo "恢复中..."
    gunzip -c "$RESTORE_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
    echo "✓ 恢复完成"
    ;;
  *)
    echo "============================================"
    echo "  数据库备份"
    echo "  时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "============================================"
    echo -n "  导出中... "
    docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"
    echo "✓"
    echo "  备份文件: $(basename "$BACKUP_FILE")"
    echo "  大小: $(du -h "$BACKUP_FILE" | cut -f1)"
    echo ""
    rotate_backups 30
    echo "  ✓ 备份完成"
    ;;
esac
