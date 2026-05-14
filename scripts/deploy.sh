#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/deploy.sh
#
# Run this on the EC2 server to deploy/update SmartShop.
# Can also be triggered automatically by GitHub Actions.
#
# Usage (on server):
#   cd /opt/smartshop && bash scripts/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR="/opt/smartshop"
COMPOSE_FILE="docker-compose.prod.yml"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'

step()  { echo -e "\n${CYAN}► $1${RESET}"; }
ok()    { echo -e "${GREEN}  ✔ $1${RESET}"; }
warn()  { echo -e "${YELLOW}  ⚠ $1${RESET}"; }
error() { echo -e "${RED}  ✗ $1${RESET}"; exit 1; }

cd "$APP_DIR" || error "App dir $APP_DIR not found. Run server-setup.sh first."

# ── Check .env exists ────────────────────────────────────────────
if [ ! -f .env ]; then
  error ".env file not found in $APP_DIR. Run: scp .env ubuntu@<IP>:/opt/smartshop/.env"
fi

# ── Pull latest code (if git repo) ──────────────────────────────
if [ -d .git ]; then
  step "Pulling latest code from git..."
  git fetch origin
  git reset --hard origin/main
  ok "Code updated to $(git log --oneline -1)"
else
  warn "Not a git repo — skipping git pull (using files as-is)"
fi

# ── Build & restart containers ───────────────────────────────────
step "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache 2>&1 | tail -15

step "Starting containers..."
docker compose -f "$COMPOSE_FILE" up -d

step "Waiting for API health check (30s)..."
sleep 30

# ── Health check ─────────────────────────────────────────────────
step "Verifying deployment..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/health 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  ok "Health check passed (HTTP $HTTP_CODE)"
else
  warn "Health check returned HTTP $HTTP_CODE — checking logs..."
  docker compose -f "$COMPOSE_FILE" logs --tail=20 api
fi

# ── Prune old images ─────────────────────────────────────────────
step "Cleaning up old Docker images..."
docker image prune -f
ok "Cleanup done"

# ── Status ───────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${GREEN} ✔ SmartShop deployed!${RESET}"
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
docker compose -f "$COMPOSE_FILE" ps
echo ""
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "<your-ec2-ip>")
echo -e "  🌐 App URL:    ${GREEN}http://${PUBLIC_IP}/${RESET}"
echo -e "  ❤  Health:    ${GREEN}http://${PUBLIC_IP}/health${RESET}"
echo -e "  📋 Logs:      docker compose -f $COMPOSE_FILE logs -f"
echo ""
