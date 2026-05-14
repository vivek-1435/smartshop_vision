#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# scripts/server-setup.sh
#
# ONE-TIME setup script for a fresh AWS EC2 Ubuntu 22.04 instance.
# Run from your LOCAL Mac (not on the server):
#
#   ssh -i ~/Downloads/smartshop-key.pem ubuntu@<EC2-IP> "bash -s" < scripts/server-setup.sh
#
# Or SSH in first, then run:
#   bash scripts/server-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; RESET='\033[0m'

step() { echo -e "\n${CYAN}► $1${RESET}"; }
ok()   { echo -e "${GREEN}  ✔ $1${RESET}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${RESET}"; }

step "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
ok "System updated"

step "Installing Docker..."
if command -v docker &>/dev/null; then
  warn "Docker already installed: $(docker --version)"
else
  # Official Docker install script
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker ubuntu
  ok "Docker installed: $(docker --version)"
fi

step "Installing Docker Compose plugin..."
if docker compose version &>/dev/null; then
  warn "Docker Compose already installed: $(docker compose version)"
else
  sudo apt-get install -y docker-compose-plugin
  ok "Docker Compose installed: $(docker compose version)"
fi

step "Enabling Docker to start on boot..."
sudo systemctl enable docker
sudo systemctl start docker
ok "Docker service enabled"

step "Installing useful tools..."
sudo apt-get install -y -qq git curl wget unzip htop ufw
ok "Tools installed"

step "Configuring firewall (UFW)..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp comment "SSH"
sudo ufw allow 80/tcp comment "HTTP"
sudo ufw allow 443/tcp comment "HTTPS (future use)"
sudo ufw --force enable
ok "Firewall configured (ports 22, 80, 443 open)"
sudo ufw status

step "Creating app directory..."
sudo mkdir -p /opt/smartshop
sudo chown ubuntu:ubuntu /opt/smartshop
ok "Created /opt/smartshop"

step "Setting up swap (helps on 1GB t2.micro)..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ok "1GB swap created and enabled"
else
  warn "Swap already exists"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo -e "${GREEN} ✔ Server setup complete!${RESET}"
echo -e "${GREEN}════════════════════════════════════════════${RESET}"
echo ""
echo "Next steps:"
echo "  1. Copy your project files:  bash scripts/push-to-server.sh"
echo "  2. Copy your .env:           scp .env ubuntu@<IP>:/opt/smartshop/.env"
echo "  3. SSH in and deploy:        ssh ubuntu@<IP> 'cd /opt/smartshop && bash scripts/deploy.sh'"
echo ""
warn "IMPORTANT: Log out and back in for docker group to take effect!"
