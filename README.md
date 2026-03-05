# Tarun's Store — Luxury E-Commerce Platform

A fully instrumented luxury e-commerce platform built for Datadog SSI (Single Step Instrumentation) demos. Features 7 microservices generating real traces, logs, and metrics.

## Architecture

```
                         ┌─────────────────┐
                         │    Frontend     │  React + nginx
                         │  (taruns-store) │
                         └────────┬────────┘
                                  │ /api/*
                         ┌────────▼────────┐
                         │   API Gateway   │  FastAPI (port 8000)
                         └────────┬────────┘
                ┌─────────────────┼─────────────────┐
                │                 │                 │
     ┌──────────▼───┐  ┌──────────▼───┐  ┌─────────▼────┐
     │   Product    │  │    User      │  │    Cart      │
     │   Service    │  │   Service    │  │   Service    │
     │  (port 8001) │  │  (port 8002) │  │  (port 8003) │
     └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                 │                 │
     ┌──────▼───────┐         │        ┌────────▼──────┐
     │  PostgreSQL  │◄────────┘        │    Redis      │
     │  (products,  │                  │   (sessions)  │
     │  users, orders)                 └───────────────┘
     └──────────────┘
            │
     ┌──────▼───────┐  ┌──────────────┐  ┌──────────────────┐
     │    Order     │  │   Payment    │  │  Notification    │
     │   Service    │  │   Service    │  │     Service      │
     │  (port 8004) │  │  (port 8005) │  │   (port 8006)    │
     └──────────────┘  └──────────────┘  └──────────────────┘
```

## Services

| Service | Port | Tech | Description |
|---------|------|------|-------------|
| `frontend` | 80 | React + nginx | Luxury storefront UI |
| `api-gateway` | 8000 | FastAPI | Routes & auth middleware |
| `product-service` | 8001 | FastAPI + PostgreSQL | Product catalog, search, reviews |
| `user-service` | 8002 | FastAPI + PostgreSQL | Auth, JWT, user profiles |
| `cart-service` | 8003 | FastAPI + Redis | Shopping cart |
| `order-service` | 8004 | FastAPI + PostgreSQL | Order management |
| `payment-service` | 8005 | FastAPI | Mock payment processing |
| `notification-service` | 8006 | FastAPI | Email/SMS notifications |

## Local Development

```bash
# 1. Copy env vars
export DD_API_KEY=your_datadog_api_key

# 2. Start everything
docker compose up --build

# 3. Open the store
open http://localhost:3000
```

## Deploy to Production (GCP GKE)

### Prerequisites
- GCP account with billing enabled
- `gcloud` CLI installed
- `kubectl` installed
- `helm` installed
- Domain name (e.g. kothadog.com)

### Step 1: GCP Setup
```bash
export GCP_PROJECT_ID=your-project-id
export DD_API_KEY=your-datadog-api-key
export DOMAIN=kothadog.com

chmod +x scripts/setup-gcp.sh
./scripts/setup-gcp.sh
```

### Step 2: GitHub Repository Setup
```bash
# Push to GitHub
git remote add origin https://github.com/kothadog067/tarun-store.git
git push -u origin main
```

### Step 3: GitHub Secrets
Add these secrets in GitHub Settings → Secrets → Actions:

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | Your GCP project ID |
| `GCP_SA_KEY` | Service account JSON (from setup script) |
| `DD_API_KEY` | Your Datadog API key |

### Step 4: Domain DNS
Point your domain's A record to the ingress IP shown by the setup script.

### Step 5: Deploy
```bash
git push origin main  # triggers GitHub Actions CI/CD
```

## Datadog SSI Setup

### Kubernetes SSI (Admission Controller)
The Datadog Operator automatically injects tracing into all pods in the `tarun-store` namespace via the `admission.datadoghq.com/python-lib.version: "latest"` annotation on each pod.

Each service also has:
- `DD_SERVICE`, `DD_ENV`, `DD_VERSION` labels
- Structured JSON logging with trace correlation
- Runtime metrics enabled
- Profiling enabled

### What You'll See in Datadog
- **APM → Service Map**: Full service topology
- **APM → Traces**: Distributed traces across all 7 services
- **Logs**: Structured JSON logs correlated with traces
- **Metrics**: Request rates, latencies, error rates per service
- **Profiles**: CPU and memory profiles for each Python service

## API Endpoints

All endpoints are available via the API Gateway at `/api/`:

```
GET  /api/products              — List products
GET  /api/products/search?q=    — Search products
GET  /api/products/{id}         — Get product
GET  /api/brands                — List brands
GET  /api/categories            — List categories

POST /api/auth/register         — Register
POST /api/auth/login            — Login

GET  /api/cart/{user_id}        — Get cart
POST /api/cart/{user_id}/items  — Add item
PUT  /api/cart/{user_id}/items/{product_id}  — Update qty
DELETE /api/cart/{user_id}/items/{product_id}  — Remove item

POST /api/orders                — Create order
GET  /api/orders/user/{user_id} — Get user orders

POST /api/payments/process      — Process payment
GET  /health                    — Gateway health + all services
```
