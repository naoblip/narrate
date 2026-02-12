#!/usr/bin/env bash
set -euo pipefail

# Narrate — VPS bootstrap script
# Run from inside the narrate repo directory:
#   ./setup.sh
#   ./setup.sh --cors "https://my-app.example.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORS_ORIGINS=""

usage() {
  echo "Usage: $0 [options]"
  echo "  --cors <origin>  CORS allowed origins (comma-separated)"
  echo "  -h, --help       Show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cors) CORS_ORIGINS="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

log()  { echo -e "\033[1;32m==>\033[0m $*"; }
warn() { echo -e "\033[1;33m==>\033[0m $*"; }
err()  { echo -e "\033[1;31m==>\033[0m $*" >&2; }

# ── 1. Check / install Docker ───────────────────────────────────────
if command -v docker &>/dev/null; then
  log "Docker found: $(docker --version)"
else
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker
  # let current user run docker without sudo
  sudo usermod -aG docker "$USER"
  warn "Added $USER to docker group. You may need to log out and back in."
  log "Docker installed: $(docker --version)"
fi

# ensure docker compose plugin is available
if ! docker compose version &>/dev/null; then
  err "docker compose plugin not found. Please install it: https://docs.docker.com/compose/install/"
  exit 1
fi

# ── 2. Verify required files ──────────────────────────────────────
log "Setting up Narrate in ${SCRIPT_DIR}"
cd "${SCRIPT_DIR}"

COMPOSE_FILE="docker-compose.yml"

for f in world.json SKILL.md; do
  if [ ! -f "$f" ]; then
    err "Missing required file: $f"
    exit 1
  fi
done

if [ ! -f "${COMPOSE_FILE}" ]; then
  err "Missing required file: ${COMPOSE_FILE}"
  exit 1
fi

log "Files verified"

# ── 4. Generate .env with secure secrets ────────────────────────────
if [ -f .env ]; then
  warn "Existing .env found — keeping it. Delete it and re-run to regenerate."
else
  POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
  ADMIN_API_KEY=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)

  cat > .env <<EOF
PORT=3000
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
ADMIN_API_KEY=${ADMIN_API_KEY}
API_KEY_PEPPER=
CORS_ORIGINS=${CORS_ORIGINS}
WEBHOOKS_ENABLED=true
WEBHOOK_TIMEOUT_MS=3000
ALLOW_LOCAL_HTTP_WEBHOOKS=false
EOF

  log "Generated .env with secure secrets"
fi

# ── 5. Pull and start ──────────────────────────────────────────────
log "Pulling images..."
docker compose -f "${COMPOSE_FILE}" pull

log "Starting Narrate..."
docker compose -f "${COMPOSE_FILE}" up -d

# ── 6. Wait for healthy ────────────────────────────────────────────
log "Waiting for server to become healthy..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
  log "Narrate is running!"
else
  err "Server didn't become healthy within 60s. Check logs: docker compose -f ${SCRIPT_DIR}/${COMPOSE_FILE} logs"
  exit 1
fi

# ── 7. Print summary ───────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Narrate is live!"
echo "============================================"
echo ""
echo "  API:        http://$(hostname -I | awk '{print $1}'):3000"
echo "  Health:     http://$(hostname -I | awk '{print $1}'):3000/health"
echo "  Directory:  ${SCRIPT_DIR}"
echo ""
echo "  Admin key:  $(grep ADMIN_API_KEY .env | cut -d= -f2)"
echo ""
echo "  Useful commands:"
echo "    cd ${SCRIPT_DIR}"
echo "    docker compose logs -f        # view logs"
echo "    docker compose restart        # restart"
echo "    docker compose down           # stop"
echo "    docker compose pull && docker compose up -d  # update"
echo ""
echo "  Create your first agent:"
echo "    curl -s http://localhost:3000/api/agents \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"name\":\"Scout\",\"species\":\"Fox\",\"traits\":[\"Curious\"]}'"
echo ""
