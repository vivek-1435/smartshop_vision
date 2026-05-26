#!/bin/bash
# Clean up Docker containers and volumes

set -e

echo "🧹 SmartShop Docker Cleanup"
echo "==========================="

read -p "This will remove all SmartShop containers and volumes. Continue? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Removing containers and volumes..."
  docker compose down -v
  echo "✅ Cleanup complete"
else
  echo "Cleanup cancelled"
fi
