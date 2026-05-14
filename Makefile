# ─────────────────────────────────────────────────────────────────────────────
# SmartShop — Developer Makefile
# Usage: make <target>
#
# Requirements: Docker + Docker Compose v2  (docker compose, not docker-compose)
# ─────────────────────────────────────────────────────────────────────────────

COMPOSE        := docker compose
COMPOSE_PROD   := docker compose -f docker-compose.yml
COMPOSE_DEV    := docker compose                       # auto-merges override.yml

# Colours
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
RESET  := \033[0m

.DEFAULT_GOAL := help

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "$(CYAN)SmartShop DevOps Commands$(RESET)"
	@echo "────────────────────────────────────────"
	@echo "  $(GREEN)make dev$(RESET)       Start full stack in dev mode (hot-reload)"
	@echo "  $(GREEN)make prod$(RESET)      Start full stack in production mode"
	@echo "  $(GREEN)make build$(RESET)     Rebuild all Docker images"
	@echo "  $(GREEN)make down$(RESET)      Stop and remove containers"
	@echo "  $(GREEN)make clean$(RESET)     Stop containers + remove volumes + images"
	@echo "  $(GREEN)make logs$(RESET)      Tail logs from all services"
	@echo "  $(GREEN)make logs-api$(RESET)  Tail backend API logs only"
	@echo "  $(GREEN)make test$(RESET)      Run backend Jest tests (inside container)"
	@echo "  $(GREEN)make test-local$(RESET) Run backend Jest tests locally (needs Node)"
	@echo "  $(GREEN)make seed$(RESET)      Seed the database with demo data"
	@echo "  $(GREEN)make shell-api$(RESET) Open shell in the running API container"
	@echo "  $(GREEN)make shell-db$(RESET)  Open mongosh in the running Mongo container"
	@echo "  $(GREEN)make health$(RESET)    Check health of all services"
	@echo "  $(GREEN)make ps$(RESET)        Show running containers"
	@echo ""

# ── Development (hot-reload) ──────────────────────────────────────────────────
.PHONY: dev
dev: _check-env
	@echo "$(CYAN)► Starting SmartShop in DEV mode (hot-reload)...$(RESET)"
	$(COMPOSE_DEV) up --build -d
	@echo ""
	@echo "$(GREEN)✔ Stack is up!$(RESET)"
	@echo "  API    → http://localhost:4000"
	@echo "  Health → http://localhost:4000/health"
	@echo "  Mongo  → mongodb://localhost:27017  (use Compass or mongosh)"
	@echo ""
	@echo "  Frontend: run $(YELLOW)cd frontend && npm run dev$(RESET) for Vite HMR"
	@echo "  Logs:  run $(YELLOW)make logs$(RESET)"

# ── Production ────────────────────────────────────────────────────────────────
.PHONY: prod
prod: _check-env
	@echo "$(CYAN)► Starting SmartShop in PRODUCTION mode...$(RESET)"
	$(COMPOSE_PROD) up --build -d
	@echo ""
	@echo "$(GREEN)✔ Stack is up!$(RESET)"
	@echo "  Frontend → http://localhost:80"
	@echo "  API      → http://localhost:4000"
	@echo "  Health   → http://localhost:4000/health"
	@echo ""
	@echo "  Logs:  run $(YELLOW)make logs$(RESET)"

# ── Build images only ─────────────────────────────────────────────────────────
.PHONY: build
build: _check-env
	@echo "$(CYAN)► Building Docker images...$(RESET)"
	$(COMPOSE_PROD) build --no-cache

# ── Stop ──────────────────────────────────────────────────────────────────────
.PHONY: down
down:
	@echo "$(YELLOW)► Stopping containers...$(RESET)"
	$(COMPOSE) down

# ── Clean (nuclear option) ────────────────────────────────────────────────────
.PHONY: clean
clean:
	@echo "$(YELLOW)► Stopping containers, removing volumes and images...$(RESET)"
	$(COMPOSE) down -v --rmi local
	@echo "$(GREEN)✔ Cleaned up.$(RESET)"

# ── Logs ──────────────────────────────────────────────────────────────────────
.PHONY: logs
logs:
	$(COMPOSE) logs -f --tail=100

.PHONY: logs-api
logs-api:
	$(COMPOSE) logs -f --tail=100 api

.PHONY: logs-web
logs-web:
	$(COMPOSE) logs -f --tail=100 web

# ── Tests ─────────────────────────────────────────────────────────────────────
.PHONY: test
test:
	@echo "$(CYAN)► Running backend tests inside Docker...$(RESET)"
	$(COMPOSE_PROD) run --rm \
		-e NODE_ENV=test \
		-e JWT_SECRET=test-secret-key-for-make-target-long \
		-e MONGODB_URI_TEST=mongodb://$(shell grep MONGO_USER .env | cut -d= -f2):$(shell grep MONGO_PASS .env | cut -d= -f2)@mongo:27017/smartshop_test?authSource=admin \
		api npm test

.PHONY: test-local
test-local:
	@echo "$(CYAN)► Running backend tests locally...$(RESET)"
	cd backend && \
		NODE_ENV=test \
		JWT_SECRET=test-secret-key-for-make-target-long \
		MONGODB_URI_TEST=mongodb://localhost:27017/smartshop_test \
		npm test

# ── Database ──────────────────────────────────────────────────────────────────
.PHONY: seed
seed:
	@echo "$(CYAN)► Seeding database with demo data...$(RESET)"
	$(COMPOSE) exec api node src/utils/seed.js

.PHONY: shell-db
shell-db:
	@echo "$(CYAN)► Opening mongosh in mongo container...$(RESET)"
	$(COMPOSE) exec mongo mongosh smartshop

# ── Shells ────────────────────────────────────────────────────────────────────
.PHONY: shell-api
shell-api:
	@echo "$(CYAN)► Opening shell in API container...$(RESET)"
	$(COMPOSE) exec api sh

# ── Health ────────────────────────────────────────────────────────────────────
.PHONY: health
health:
	@echo "$(CYAN)► Checking service health...$(RESET)"
	@curl -sf http://localhost:4000/health | python3 -m json.tool 2>/dev/null || \
		echo "$(YELLOW)API not reachable. Is the stack running? (make dev or make prod)$(RESET)"

# ── Status ────────────────────────────────────────────────────────────────────
.PHONY: ps
ps:
	$(COMPOSE) ps

# ── Internal: env file guard ──────────────────────────────────────────────────
.PHONY: _check-env
_check-env:
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)⚠ No .env file found. Copying from .env.example...$(RESET)"; \
		cp .env.example .env; \
		echo "$(YELLOW)  ⚠ Edit .env with your real secrets before running in production!$(RESET)"; \
	fi
