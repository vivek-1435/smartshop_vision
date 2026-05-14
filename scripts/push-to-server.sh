#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/push-to-server.sh
#
# Run this from your LOCAL Mac to copy the project to the EC2 server.
# Usage: EC2_IP=<your-ip> EC2_KEY=~/Downloads/smartshop-key.pem bash scripts/push-to-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

EC2_IP="${EC2_IP:?Set EC2_IP env var: export EC2_IP=<your-ec2-ip>}"
EC2_KEY="${EC2_KEY:-~/Downloads/smartshop-key.pem}"
EC2_USER="${EC2_USER:-ubuntu}"
APP_DIR="/opt/smartshop"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RESET='\033[0m'
step() { echo -e "\n${CYAN}► $1${RESET}"; }
ok()   { echo -e "${GREEN}  ✔ $1${RESET}"; }

SSH_CMD="ssh -i ${EC2_KEY} -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_IP}"
SCP_CMD="scp -i ${EC2_KEY} -o StrictHostKeyChecking=no"

step "Creating app directory on server..."
$SSH_CMD "sudo mkdir -p ${APP_DIR} && sudo chown ${EC2_USER}:${EC2_USER} ${APP_DIR}"

step "Copying project files (excluding node_modules, .git, dist)..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'frontend/dist' \
  --exclude 'backend/logs' \
  --exclude '*.log' \
  -e "ssh -i ${EC2_KEY} -o StrictHostKeyChecking=no" \
  ./ "${EC2_USER}@${EC2_IP}:${APP_DIR}/"
ok "Project files copied"

step "Copying .env to server..."
$SCP_CMD .env "${EC2_USER}@${EC2_IP}:${APP_DIR}/.env"
ok ".env copied (KEEP THIS SECRET — it's not in git)"

step "Making scripts executable..."
$SSH_CMD "chmod +x ${APP_DIR}/scripts/*.sh"
ok "Scripts are executable"

echo ""
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${GREEN} ✔ Files pushed to EC2!${RESET}"
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo ""
echo "Now deploy the app:"
echo "  ssh -i ${EC2_KEY} ${EC2_USER}@${EC2_IP}"
echo "  cd ${APP_DIR} && bash scripts/deploy.sh"
