import os
import uuid
import logging
import json
import time
from datetime import datetime
from typing import Optional

import httpx
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "api-gateway",
            "message": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("api-gateway")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

SERVICES = {
    "products": os.getenv("PRODUCT_SERVICE_URL", "http://product-service:8001"),
    "users": os.getenv("USER_SERVICE_URL", "http://user-service:8002"),
    "cart": os.getenv("CART_SERVICE_URL", "http://cart-service:8003"),
    "orders": os.getenv("ORDER_SERVICE_URL", "http://order-service:8004"),
    "payments": os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8005"),
    "notifications": os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8006"),
}

app = FastAPI(title="API Gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.time()
    request.state.request_id = request_id
    logger.info(json.dumps({
        "event": "request",
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "client": request.client.host if request.client else "unknown",
    }))
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(json.dumps({
        "event": "response",
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
        "status": response.status_code,
        "duration_ms": round(duration_ms, 2),
    }))
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    return response


async def proxy(request: Request, service_name: str, path: str):
    base_url = SERVICES.get(service_name)
    if not base_url:
        raise HTTPException(status_code=404, detail=f"Service '{service_name}' not found")

    url = f"{base_url}/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)
    headers["X-Request-ID"] = getattr(request.state, "request_id", str(uuid.uuid4()))

    try:
        body = await request.body()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                method=request.method,
                url=url,
                headers=headers,
                content=body,
            )
        return Response(
            content=resp.content,
            status_code=resp.status_code,
            headers=dict(resp.headers),
            media_type=resp.headers.get("content-type", "application/json"),
        )
    except httpx.ConnectError:
        logger.error(f"Cannot connect to {service_name} at {base_url}")
        raise HTTPException(status_code=503, detail=f"Service {service_name} unavailable")
    except httpx.TimeoutException:
        logger.error(f"Timeout connecting to {service_name}")
        raise HTTPException(status_code=504, detail=f"Service {service_name} timeout")


@app.get("/health")
async def health():
    results = {"gateway": "healthy", "services": {}}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for name, url in SERVICES.items():
            try:
                resp = await client.get(f"{url}/health")
                results["services"][name] = "healthy" if resp.status_code == 200 else "unhealthy"
            except Exception:
                results["services"][name] = "unreachable"
    return results


# Product routes
@app.api_route("/api/products/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def products_proxy(request: Request, path: str):
    return await proxy(request, "products", f"products/{path}")

@app.api_route("/api/products", methods=["GET", "POST"])
async def products_root(request: Request):
    return await proxy(request, "products", "products")

@app.api_route("/api/brands", methods=["GET"])
async def brands_proxy(request: Request):
    return await proxy(request, "products", "brands")

@app.api_route("/api/categories", methods=["GET"])
async def categories_proxy(request: Request):
    return await proxy(request, "products", "categories")

# User/auth routes
@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_proxy(request: Request, path: str):
    return await proxy(request, "users", f"auth/{path}")

@app.api_route("/api/users/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def users_proxy(request: Request, path: str):
    return await proxy(request, "users", f"users/{path}")

# Cart routes
@app.api_route("/api/cart/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def cart_proxy(request: Request, path: str):
    return await proxy(request, "cart", f"cart/{path}")

# Order routes
@app.api_route("/api/orders/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def orders_proxy(request: Request, path: str):
    return await proxy(request, "orders", f"orders/{path}")

@app.api_route("/api/orders", methods=["GET", "POST"])
async def orders_root(request: Request):
    return await proxy(request, "orders", "orders")

# Payment routes
@app.api_route("/api/payments/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def payments_proxy(request: Request, path: str):
    return await proxy(request, "payments", f"payments/{path}")

# Notification routes
@app.api_route("/api/notifications/{path:path}", methods=["GET", "POST"])
async def notifications_proxy(request: Request, path: str):
    return await proxy(request, "notifications", f"notifications/{path}")

@app.api_route("/api/notifications", methods=["GET"])
async def notifications_root(request: Request):
    return await proxy(request, "notifications", "notifications")
