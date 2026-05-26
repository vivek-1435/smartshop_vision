# SmartShop — Production-Ready Auto Shop Bill Calculator (with Docker Deployment)

SmartShop is a mobile-first, high-performance billing system featuring **on-device AI vision**, UPI payments, and real-time analytics. Designed for auto repair shops and spare parts dealers, all image classification and neural inference run 100% inside the browser using TensorFlow.js and IndexedDB—ensuring absolute privacy with zero image data leaving the device.

This repository is equipped with a **production-grade, fully containerized Docker architecture** designed for quick, robust local deployment or VPS hosting.

---

## 📂 Unified Architecture Overview

SmartShop utilizes a simplified, high-efficiency **Single Gateway** multi-container setup. Instead of running a redundant external Nginx proxy, the Frontend container itself acts as the entrypoint reverse-proxy—handling static asset serving, client-side SPA routing, and API request forwarding.

```
                  ┌──────────────────────────────────────────────┐
                  │              User Web Browser                │
                  └──────────────────────┬───────────────────────┘
                                         │ (Port 80)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │         smartshop-frontend (Nginx)           │
                  ├──────────────────────┬───────────────────────┤
                  │                      │                       │
                  │  (Static HTML/JS/CSS)│  (Proxy /api/* requests)
                  │  └─→ Serves locally  │  └─→ Forward to Backend
                  └──────────────────────┼───────────────────────┘
                                         │ (smartshop-network:4000)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           smartshop-backend (Node)           │
                  ├──────────────────────┬───────────────────────┤
                  │                      │                       │
                  │                      │  (Queries & Updates)  │
                  │                      └─→ Database            │
                  └──────────────────────┬───────────────────────┘
                                         │ (smartshop-network:27017)
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            smartshop-mongo (MongoDB)         │
                  └──────────────────────────────────────────────┘
```

---

## 🐳 Docker Deployment Details

The Docker environment orchestrates three specialized services inside a secure, custom bridge network (`smartshop-network`).

### 1. Frontend & Gateway Container (`frontend/Dockerfile`)
- **Stage 1 (Build)**: Compiles the React 18 / Vite 5 application using Node 20. Tensorflow.js and PDF utilities are split into separate chunks to minimize the initial load footprint.
- **Stage 2 (Runtime)**: Serves the static assets via Nginx Alpine (~150MB total size). 
- **Routing**: Mounts `nginx.conf` directly, serving:
  - `/` -> Local static React files with automatic SPA route redirection (`try_files`).
  - `/api/` -> Proxied directly to `http://backend:4000/api/` (preserving path structure).
  - `/health` -> Proxied to backend health probe for container orchestrator checks.

### 2. Backend API Container (`backend/Dockerfile`)
- **Base**: Minimalist Node 20 Alpine (~350MB).
- **Security**: Includes `dumb-init` as the entrypoint to handle kernel signals (like `SIGTERM` and `SIGINT`) properly, enabling graceful shutdowns. Runs under production configuration with strict rate limiters, Helmet headers, and Express Mongo injection sanitizers.
- **Internal Only**: The backend runs internally at port `4000` and is **not exposed** to the host machine. All external API requests must safely route through the frontend's reverse proxy.

### 3. Database Container (`mongo:5.0`)
- **Base**: Official MongoDB 5.0 image.
- **Data Persistence**: Uses named Docker volumes (`mongo_data` and `mongo_config`) to ensure that transaction data and configuration are fully preserved across container restarts and updates.
- **Security**: Configured with strict root user authentication.

---

## ⚡ Relative Path Routing Resolution

Single-Page Apps (SPAs) bake environment variables at image build time. When building inside Docker, `.env` files are excluded by `.dockerignore` for security, which traditionally sets the API target to a hardcoded URL. 

To overcome this, the Axios HTTP client is configured in [api.js](frontend/src/utils/api.js) to resolve requests dynamically:
```javascript
const apiBase = import.meta.env.VITE_API_URL || '';
```
- **In Docker**: `VITE_API_URL` is undefined, setting `apiBase` to `''`. The browser issues relative requests (e.g. `/api/auth/login`), which Nginx receives on port 80 and proxies directly to the backend. This eliminates CORS configuration issues and prevents exposing backend ports externally.
- **In Local Development**: If running the frontend outside Docker, Vite's local dev server automatically catches `/api/` requests and proxies them to the backend at `http://localhost:4000`.

---

## 🚀 Quick Start in 3 Steps

### 1. Set Environment Configuration
Create your environment file in the root directory:
```bash
cp .env.example .env
```
Ensure you generate a secure JWT secret and configure a database password:
```env
MONGO_USER=admin
MONGO_PASS=SmartShop_Secure_Pass_2026
JWT_SECRET=a94a514bf93892de6ca42167462adc065654e2f645ddceea7c30393e119e9bbb1a28456cab0647a1e7280ddbb7b167e068a6634cf0d4f0d614ea9d2f6f5a45f2
```

### 2. Start Everything & Get Access Links
Execute the helper script to verify Docker Desktop status, build the optimized images, and start the containers. **Upon successful startup, the script will output the direct clickable links to access your project:**
```bash
./start-docker.sh
```
*Alternatively, you can boot the containers manually using standard Docker Compose (without the summary printout):*
```bash
docker compose up -d
```

### 3. Pause, Resume, or Stop the Project
You can temporarily suspend or pause your running project containers without deleting them, or stop them completely:
```bash
# Pause the running project (freezes container execution state)
docker compose pause

# Resume the project (unpauses and restores execution instantly)
docker compose unpause

# Stop/shut down the containers (retains persistent data)
docker compose stop
```

### 4. Fully Clean/Reset the Environment (Database Wipe)
We have provided an interactive utility script `cleanup-docker.sh` in the root folder. Running this script will:
1. **Prompt you for confirmation** to prevent accidental data loss.
2. **Stop and remove** all running SmartShop containers and the virtual bridge network.
3. **Completely delete** the persistent MongoDB volumes (`mongo_data` and `mongo_config`), doing a complete database reset.

This is highly useful when you want to wipe the system and start over from a clean slate.
```bash
./cleanup-docker.sh
```

### 5. Seed Demo Data (Optional)
To populate a demo shop with predefined automotive parts and services:
```bash
docker compose exec backend npm run seed
```

---

## 📱 Containerized Access Points

Once the containers show **healthy** status in Docker:
- **Frontend / Application**: [http://localhost](http://localhost)
- **Backend API Proxy**: [http://localhost/api](http://localhost/api)
- **Health Diagnostics**: [http://localhost/health](http://localhost/health)

---

## 🛠️ Operations & Maintenance Checklist

| Action | Command | Purpose |
| :--- | :--- | :--- |
| **Start Services** | `docker compose up -d` | Launch all services in background |
| **Pause Project** | `docker compose pause` | Freezes container execution without losing state |
| **Resume Project** | `docker compose unpause` | Instantly unpauses and resumes the frozen project |
| **Stop Services (Soft)** | `docker compose stop` | Gracefully shuts down container execution |
| **Stop & Clear Containers** | `docker compose down` | Stops and removes running containers |
| **View Service Logs** | `docker compose logs -f` | Inspect live terminal output of all services |
| **Rebuild & Restart** | `docker compose up -d --build` | Re-build images and boot after code changes |
| **Run API Tests** | `docker compose exec backend npm test` | Runs Jest integration test suite in container |
| **Database Prompt** | `docker compose exec mongo mongosh -u admin` | Opens direct MongoDB terminal shell |
| **Clean Wipe** | `./cleanup-docker.sh` (or `docker compose down -v`) | Stops containers and deletes database volumes |

---

## 🐛 Troubleshooting Guidelines

### ❌ `POST /auth/login not found` (404 Error)
- **Cause**: Nginx routing rules are stripping the prefix.
- **Fix**: Verify your `nginx.conf` has `proxy_pass http://backend:4000;` **without** a trailing slash on the port. Adding a trailing slash causes Nginx to strip the `/api/` prefix, leading to a backend routing mismatch.

### ❌ Frontend displays standard Nginx default screen / Blank Page
- **Cause**: Corrupted build or Nginx is pointing to a wrong directory.
- **Fix**: Rebuild your frontend bundle: `docker compose up -d --build frontend`. Make sure `frontend/Dockerfile` correctly copies the compiled `/app/dist` folder to `/usr/share/nginx/html`.

### ❌ Backend container keeps restarting / database errors
- **Cause**: MongoDB is not initialized or credential mismatch.
- **Fix**: Check logs with `docker compose logs mongo`. Verify that `MONGO_PASS` in your root `.env` matches the credentials used in `docker-compose.yml`.

---

## 💻 Local Non-Docker Development

If you wish to run the project locally without Docker:

### 1. Spin up the backend:
```bash
cd backend
npm install
cp .env.example .env # Set MONGODB_URI (e.g. local mongodb://localhost:27017/smartshop) and JWT_SECRET
npm run dev
```

### 2. Spin up the frontend:
```bash
cd ../frontend
npm install
cp .env.example .env # Set VITE_API_URL=http://localhost:4000
npm run dev
```
Access the application on [http://localhost:5173](http://localhost:5173). The Vite server will automatically proxy API calls to port `4000`.
