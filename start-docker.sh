#!/bin/bash
# SmartShop Docker Quick Start Script

set -e

echo "🚀 SmartShop Docker Setup"
echo "========================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker Desktop is not running. Please start Docker and try again."
  exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env created. Please edit it with your configuration values."
  echo ""
  echo "Required configuration:"
  echo "  - MONGO_PASS: MongoDB password"
  echo "  - JWT_SECRET: Generate with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
  echo "  - CLOUDINARY_* : Image upload service credentials (optional)"
  echo ""
  read -p "Press Enter after updating .env..."
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$JWT_SECRET" ]; then
  echo "❌ JWT_SECRET is not set in .env"
  exit 1
fi

echo ""
echo "🏗️  Building Docker images..."
docker compose build

echo ""
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ SmartShop is running!"
echo ""
echo "📱 Access the application:"
echo "   Frontend:      http://localhost"
echo "   Backend API:   http://localhost/api"
echo "   Health Check:  http://localhost/health"
echo ""
echo "📊 View logs:"
echo "   All:       docker compose logs -f"
echo "   Backend:   docker compose logs -f backend"
echo "   Frontend:  docker compose logs -f frontend"
echo "   MongoDB:   docker compose logs -f mongo"
echo ""
echo "🛑 To stop:"
echo "   docker compose down"
echo ""
echo "📚 For more information, see DOCKER_SETUP.md"
