# SmartShop — Production-Ready Auto Shop Bill Calculator

Mobile-first billing system with **on-device AI vision**, UPI payments, and real-time analytics.  
No external AI API. No image data leaves the device.

---

## What's included

| Layer | Stack |
|---|---|
| Frontend | React 18 · Vite 5 · TailwindCSS · TF.js · PWA |
| Vision AI | MobileNetV3-Small + KNN (100% in-browser, IndexedDB) |
| Backend | Node 20 · Express · MongoDB · Cloudinary |
| Auth | JWT + bcrypt-12 + httpOnly cookie |
| Infra | Docker Compose · Nginx · GitHub Actions CI/CD |
| Tests | Jest + Supertest (auth, bills, analytics, health) |

---

## Quick Start

### Option A — Docker (recommended)
```bash
git clone https://github.com/yourname/smartshop && cd smartshop

cp .env.example .env          # fill in secrets
docker compose up -d          # starts mongo + api + web

# App  → http://localhost
# API  → http://localhost:4000/health
```

### Option B — Local dev
```bash
# Terminal 1 – backend
cd backend && npm install
cp .env.example .env          # set MONGODB_URI + JWT_SECRET
npm run dev                   # port 4000

# Terminal 2 – frontend
cd frontend && npm install
cp .env.example .env          # set VITE_API_URL=http://localhost:4000
npm run dev                   # port 5173

# Seed demo shop + products
cd backend && npm run seed
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
PORT=4000
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smartshop
JWT_SECRET=<64-char-hex>       # openssl rand -hex 64
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
FRONTEND_URL=https://smartshop.yourdomain.com
LOG_LEVEL=info
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://api.smartshop.yourdomain.com
```

---

## Project Structure

```
smartshop/
├── backend/
│   ├── src/
│   │   ├── index.js              Helmet · CORS · rate-limit · compression · graceful shutdown
│   │   ├── middleware/
│   │   │   ├── auth.js           JWT verify · passwordChangedAt guard · cookie fallback
│   │   │   ├── validate.js       express-validator rules for every route
│   │   │   └── errorHandler.js   Central handler · AppError · no stack leaks in prod
│   │   ├── models/
│   │   │   ├── Shopkeeper.js     bcrypt-12 · auto shopId · passwordChangedAt
│   │   │   ├── Product.js        Full-text index · Cloudinary ref · sampleCount sync
│   │   │   └── Bill.js           Atomic billNumber · auto billCode · refund status
│   │   ├── routes/
│   │   │   ├── auth.js           register · login · logout · me · profile · change-password
│   │   │   ├── shop.js           dashboard · qr · public/:shopId
│   │   │   ├── products.js       CRUD · categories · sample-count · Cloudinary cleanup
│   │   │   ├── bills.js          create · list · get · mark-paid · refund
│   │   │   ├── analytics.js      week/month/year MongoDB aggregation pipelines
│   │   │   └── vision.js         Status stub (all inference is on-device)
│   │   └── utils/
│   │       ├── logger.js         Winston rotating files + console
│   │       └── seed.js           Demo shop + products seeder
│   ├── tests/api.test.js         Jest + Supertest — 20 test cases
│   ├── jest.config.js
│   ├── Dockerfile                Multi-stage · non-root user · healthcheck
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx              ErrorBoundary · OfflineBanner · Toaster
│   │   ├── App.jsx               Lazy routes · Suspense · PrivateRoute · 404 redirect
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx Catches render errors · recovery UI
│   │   │   ├── OfflineBanner.jsx Live network status indicator
│   │   │   ├── ModelLoader.jsx   MobileNetV3 download progress bar
│   │   │   ├── BottomNav.jsx
│   │   │   └── QRCodeDisplay.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   Token + httpOnly cookie · auto-redirect on 401
│   │   │   └── CartContext.jsx   Cart state · totals · GST
│   │   ├── hooks/
│   │   │   ├── useVision.js      useModelLoader · useVisionTrainer · useVisionScanner
│   │   │   └── useCamera.js      MediaDevices · stream lifecycle
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx     Stats · QR code · recent bills
│   │   │   ├── Analytics.jsx     Bar chart · top products · period tabs
│   │   │   ├── TrainModel.jsx    Upload/camera capture · quality bar · export/import
│   │   │   ├── Scanner.jsx       3-tab UI: catalog · cart · manual add/remove
│   │   │   └── BillPage.jsx      Itemised bill · PDF download · UPI QR + deeplink
│   │   └── utils/
│   │       ├── visionEngine.js   MobileNetV3 + KNN + augmentation + IndexedDB
│   │       ├── api.js            Axios · 401 interceptor · token injection
│   │       └── billPDF.js        jsPDF bill generation
│   ├── public/
│   │   ├── manifest.json         PWA manifest with shortcuts
│   │   └── icons/                SVG icons (replace with PNGs for production)
│   ├── Dockerfile                Multi-stage Vite build → nginx:alpine
│   ├── nginx.conf                SPA routing · gzip · cache headers · security headers
│   └── .env.example
│
├── docker-compose.yml            mongo + api + web · health checks · named volumes
├── .github/workflows/ci.yml      Test → Build → Docker push on main
├── .gitignore
└── .env.example                  Root secrets for docker-compose
```

---

## Vision AI — How It Works

```
Training (shopkeeper):
  Photo → MobileNetV3 → 1024-d embedding
         × 5 augmented variants (flip, brightness)
         → stored in IndexedDB as Float32Array

Inference (customer scanning):
  Camera frame every 1.5s
  → 224×224 canvas crop
  → MobileNetV3 → 1024-d embedding
  → KNN (K=3) vote on stored embeddings
  → cosine similarity > 55% → fire onDetected → add to cart
```

| Property | Value |
|---|---|
| Model | MobileNetV3-Small (TF Hub) |
| Size | ~2 MB, cached after first load |
| Embedding | 1024-d L2-normalised |
| Classifier | KNN, K=3, cosine similarity |
| Confidence threshold | 0.55 |
| Inference interval | 1500 ms |
| Debounce | 5000 ms (same product) |
| Storage | IndexedDB, per-shop namespace |
| Server calls | Zero — no images leave the device |

**Recommended training:** 3–5 diverse photos per product → auto-generates ~20 augmented samples → "Well trained" status.

---

## API Reference

### Auth
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/api/auth/register` | — | `shopName, ownerName, email, password, upiId` |
| POST | `/api/auth/login` | — | `email, password` |
| POST | `/api/auth/logout` | — | — |
| GET | `/api/auth/me` | 🔒 | — |
| PATCH | `/api/auth/profile` | 🔒 | `shopName, ownerName, upiId, phone, address, gstNumber` |
| PATCH | `/api/auth/change-password` | 🔒 | `currentPassword, newPassword` |

### Products
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/products` | 🔒 | `?search=&category=` |
| GET | `/api/products/public/:shopId` | — | Customer-facing catalog |
| GET | `/api/products/categories` | 🔒 | Distinct category list |
| POST | `/api/products` | 🔒 | `multipart/form-data` with `image` file |
| PATCH | `/api/products/:id` | 🔒 | Update fields |
| PATCH | `/api/products/:id/sample-count` | 🔒 | Sync on-device KNN count |
| DELETE | `/api/products/:id` | 🔒 | Soft-delete, preserves bill history |

### Bills
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/api/bills` | — | Customer creates: `shopId, items[]` |
| GET | `/api/bills` | 🔒 | `?page=&limit=&status=&from=&to=&search=` |
| GET | `/api/bills/:id` | — | Public bill view |
| PATCH | `/api/bills/:id/payment` | — | `paymentMethod, upiTransactionId` |
| PATCH | `/api/bills/:id/refund` | 🔒 | Shopkeeper only |

### Analytics & Shop
| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/api/analytics` | 🔒 | `?period=week\|month\|year` |
| GET | `/api/shop/dashboard` | 🔒 | Stats + recent bills |
| GET | `/api/shop/qr` | 🔒 | Customer entry QR URL |
| GET | `/api/shop/public/:shopId` | — | Public shop info |
| GET | `/health` | — | Health check |

---

## Security

- **Passwords:** bcrypt with 12 rounds
- **JWT:** `passwordChangedAt` guard invalidates tokens on password change
- **Auth:** supports both `Authorization: Bearer` header and `httpOnly` cookie
- **Headers:** Helmet on every response
- **Injection:** express-mongo-sanitize strips `$` and `.` from inputs
- **Rate limiting:** 500 req/15 min global, 20 req/15 min on auth routes
- **Validation:** express-validator on every route — 422 with field-level errors
- **Errors:** no stack traces in production responses
- **CORS:** environment-based allowlist, comma-separated for multi-domain
- **Docker:** non-root user, minimal Alpine image
- **Shutdown:** SIGTERM/SIGINT graceful drain with 10s hard timeout

---

## Tests

```bash
cd backend && npm test

# Auth          ✓ register  ✓ duplicate rejected  ✓ weak password
#               ✓ login     ✓ wrong password       ✓ me  ✓ no token
# Shop          ✓ dashboard  ✓ qr  ✓ public  ✓ 404
# Bills         ✓ create  ✓ empty rejected  ✓ get  ✓ mark paid  ✓ list
# Analytics     ✓ week period  ✓ invalid period rejected
# Health        ✓ ok
```

---

## Deployment

### Railway + Vercel (simplest)
```
Backend  → Railway: connect repo, set env vars, deploy backend/
Frontend → Vercel:  connect repo, root=frontend, set VITE_API_URL
Database → MongoDB Atlas: free M0 cluster is fine for small shops
Images   → Cloudinary: free tier handles thousands of product images
```

### VPS with Docker Compose
```bash
# First deploy
git clone ... && cd smartshop
cp .env.example .env && nano .env
docker compose up -d

# Rolling update (zero downtime)
git pull
docker compose build
docker compose up -d --no-deps api web
```

### GitHub Actions (CI/CD)
Push to `main` → runs tests → builds Docker images → pushes to Docker Hub.

Set these secrets in your GitHub repo:
- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `VITE_API_URL`

---

## PWA Install

On mobile Chrome/Safari: tap **"Add to Home Screen"** — the app installs as a native-like PWA with:
- Offline-capable scanning (model cached in browser)
- Portrait lock
- Standalone display (no browser chrome)
- App shortcuts (Scan / Dashboard)
