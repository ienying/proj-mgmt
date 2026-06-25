#!/bin/bash
set -Eeuo pipefail

# ============================================
# 一键部署脚本
# 用法:
#   ./deploy/deploy.sh                  # 部署当前分支最新代码
#   ./deploy/deploy.sh v1.0.0           # 部署指定版本 tag
#   ./deploy/deploy.sh --backup-only    # 仅备份数据库
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
BACKUP_DIR="$PROJECT_DIR/.backups"

# 加载环境变量
if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a && source "$PROJECT_DIR/.env.production" && set +a
elif [ -f "$PROJECT_DIR/.env" ]; then
  set -a && source "$PROJECT_DIR/.env" && set +a
fi

VERSION="${1:-latest}"
BACKUP_ONLY=false
if [ "$VERSION" = "--backup-only" ]; then
  BACKUP_ONLY=true
fi

# ---- 颜色 ----
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[DEPLOY]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*"; }

# ============================================
# 1. 备份数据库
# ============================================
backup_db() {
  mkdir -p "$BACKUP_DIR"
  local ts=$(date +%Y%m%d_%H%M%S)
  local file="$BACKUP_DIR/${PG_DB:-projmgmt}_${ts}.sql.gz"

  log "备份数据库 → $file"
  if docker compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U "${PG_USER:-projmgmt}" -d "${PG_DB:-projmgmt}" \
    | gzip > "$file"; then
    log "备份完成 ($(du -h "$file" | cut -f1))"
  else
    err "备份失败，中止部署"
    exit 1
  fi

  # 保留最近 10 个备份
  ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
}

if [ "$BACKUP_ONLY" = true ]; then
  backup_db
  log "仅备份模式完成"
  exit 0
fi

# ============================================
# 2. 拉取代码
# ============================================
log "拉取代码..."
cd "$PROJECT_DIR"

# 保存当前分支
OLD_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

git fetch --tags

if [ "$VERSION" != "latest" ]; then
  log "切换到版本: $VERSION"
  git checkout "$VERSION"
else
  git pull origin "$(git rev-parse --abbrev-ref HEAD)"
fi

CURRENT_TAG=$(git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD)
log "当前版本: $CURRENT_TAG"

# ============================================
# 3. 备份数据库
# ============================================
backup_db

# ============================================
# 4. 构建 & 启动
# ============================================
log "构建 Docker 镜像..."
docker compose -f "$COMPOSE_FILE" build --no-cache

log "停止旧容器..."
docker compose -f "$COMPOSE_FILE" down --remove-orphans

log "启动服务..."
docker compose -f "$COMPOSE_FILE" up -d

# ============================================
# 5. 等待健康检查通过
# ============================================
log "等待应用健康检查..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:${PORT:-5000}/ > /dev/null 2>&1; then
    log "应用已就绪"
    break
  fi
  if [ $i -eq 30 ]; then
    err "健康检查超时，请查看日志: docker compose -f $COMPOSE_FILE logs app"
    exit 1
  fi
  sleep 2
done

# ============================================
# 6. 执行数据库迁移
# ============================================
log "执行数据库迁移..."
bash "$SCRIPT_DIR/migrate.sh" --docker

# ============================================
# 7. 验证
# ============================================
log "最终健康检查..."
sleep 3
if curl -sf http://localhost:${PORT:-5000}/ > /dev/null 2>&1; then
  log "✓ 部署成功! 版本: $CURRENT_TAG"
else
  err "部署后健康检查失败"
  warn "尝试回滚: git checkout $OLD_BRANCH && docker compose -f $COMPOSE_FILE up -d"
  exit 1
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  部署完成${NC}"
echo -e "${GREEN}  版本: $CURRENT_TAG${NC}"
echo -e "${GREEN}  端口: ${PORT:-5000}${NC}"
echo -e "${GREEN}============================================${NC}"
