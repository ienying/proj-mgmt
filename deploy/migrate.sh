#!/bin/bash
set -Eeuo pipefail

# ============================================
# 数据库迁移脚本 — 按顺序执行未应用的迁移
# 用法:
#   ./deploy/migrate.sh                    # 从宿主机直连数据库
#   ./deploy/migrate.sh --docker           # 通过 Docker 容器执行（数据库在容器中）
#   ./deploy/migrate.sh --dry-run          # 仅列出待执行的迁移，不实际执行
# ============================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_DIR/scripts/migrations"

# 加载 .env.production（如果存在），否则加载 .env
if [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a && source "$PROJECT_DIR/.env.production" && set +a
elif [ -f "$PROJECT_DIR/.env" ]; then
  set -a && source "$PROJECT_DIR/.env" && set +a
fi

MODE="host"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --docker) MODE="docker" ;;
    --dry-run) DRY_RUN=true ;;
    *) echo "未知参数: $arg"; exit 1 ;;
  esac
done

# 构建 psql 连接命令
run_psql() {
  local sql="$1"
  if [ "$MODE" = "docker" ]; then
    docker compose -f "$PROJECT_DIR/deploy/docker-compose.prod.yml" exec -T postgres \
      psql -U "${PG_USER:-projmgmt}" -d "${PG_DB:-projmgmt}" -c "$sql"
  else
    PGPASSWORD="${PG_PASSWORD}" psql \
      -h "${PG_HOST:-127.0.0.1}" \
      -p "${PG_PORT:-5432}" \
      -U "${PG_USER:-projmgmt}" \
      -d "${PG_DB:-projmgmt}" \
      -c "$sql"
  fi
}

run_psql_file() {
  local file="$1"
  if [ "$MODE" = "docker" ]; then
    docker compose -f "$PROJECT_DIR/deploy/docker-compose.prod.yml" exec -T postgres \
      psql -U "${PG_USER:-projmgmt}" -d "${PG_DB:-projmgmt}" -f - < "$file"
  else
    PGPASSWORD="${PG_PASSWORD}" psql \
      -h "${PG_HOST:-127.0.0.1}" \
      -p "${PG_PORT:-5432}" \
      -U "${PG_USER:-projmgmt}" \
      -d "${PG_DB:-projmgmt}" \
      -f "$file"
  fi
}

echo "============================================"
echo "  数据库迁移"
echo "  模式: $MODE | 数据库: ${PG_DB:-projmgmt}"
echo "============================================"

# 1. 创建迁移追踪表
echo ""
echo "[1/3] 初始化迁移追踪表..."
run_psql "CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);"
echo "  ✓ 迁移追踪表就绪"

# 2. 列出所有迁移文件
echo ""
echo "[2/3] 扫描迁移文件..."
migrations=($(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort))

if [ ${#migrations[@]} -eq 0 ]; then
  echo "  无迁移文件"
  exit 0
fi

# 3. 获取已应用的迁移
echo ""
echo "[3/3] 执行待应用的迁移..."
applied=$(run_psql "SELECT filename FROM _migrations ORDER BY filename;" -t 2>/dev/null || echo "")

pending=()
for f in "${migrations[@]}"; do
  fname=$(basename "$f")
  if ! echo "$applied" | grep -qF "$fname"; then
    pending+=("$f")
  fi
done

if [ ${#pending[@]} -eq 0 ]; then
  echo "  所有迁移已应用，无需执行"
  exit 0
fi

echo "  待执行 ${#pending[@]} 个迁移:"
for f in "${pending[@]}"; do
  echo "    - $(basename "$f")"
done

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "  (dry-run 模式，未实际执行)"
  exit 0
fi

# 4. 逐个执行迁移
echo ""
failed=0
for f in "${pending[@]}"; do
  fname=$(basename "$f")
  echo -n "  执行 $fname ... "
  if run_psql_file "$f"; then
    run_psql "INSERT INTO _migrations (filename) VALUES ('$fname');"
    echo "✓"
  else
    echo "✗ 失败!"
    failed=1
    break
  fi
done

echo ""
if [ $failed -eq 0 ]; then
  echo "✓ 全部迁移完成"
else
  echo "✗ 迁移中止，请检查错误后重试"
  exit 1
fi
