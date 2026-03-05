import os
import uuid
import logging
import json
from datetime import datetime
from typing import List, Optional

import redis
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "cart-service",
            "message": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("cart-service")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

CART_TTL = 60 * 60 * 24 * 7  # 7 days


class CartItem(BaseModel):
    product_id: str
    name: str
    brand: str
    price: float
    image_url: Optional[str] = None
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class AddItemRequest(BaseModel):
    product_id: str
    name: str
    brand: str
    price: float
    image_url: Optional[str] = None
    quantity: int = 1


def get_cart_key(user_id: str) -> str:
    return f"cart:{user_id}"


def get_cart(user_id: str) -> dict:
    key = get_cart_key(user_id)
    data = redis_client.get(key)
    if data:
        return json.loads(data)
    return {"user_id": user_id, "items": [], "updated_at": datetime.utcnow().isoformat()}


def save_cart(user_id: str, cart: dict):
    key = get_cart_key(user_id)
    cart["updated_at"] = datetime.utcnow().isoformat()
    redis_client.setex(key, CART_TTL, json.dumps(cart))


def cart_totals(cart: dict) -> dict:
    items = cart.get("items", [])
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    item_count = sum(i["quantity"] for i in items)
    tax = round(subtotal * 0.085, 2)
    total = round(subtotal + tax, 2)
    return {**cart, "subtotal": round(subtotal, 2), "tax": tax, "total": total, "item_count": item_count}


app = FastAPI(title="Cart Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = datetime.utcnow()
    response = await call_next(request)
    duration = (datetime.utcnow() - start).total_seconds() * 1000
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration:.2f}ms")
    return response


@app.get("/health")
def health():
    try:
        redis_client.ping()
        return {"status": "healthy", "service": "cart-service", "redis": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@app.get("/cart/{user_id}")
def get_user_cart(user_id: str):
    logger.info(f"Get cart user_id={user_id}")
    cart = get_cart(user_id)
    return cart_totals(cart)


@app.post("/cart/{user_id}/items")
def add_item(user_id: str, item: AddItemRequest):
    logger.info(f"Add item to cart user_id={user_id} product_id={item.product_id} qty={item.quantity}")
    cart = get_cart(user_id)
    items = cart["items"]

    existing = next((i for i in items if i["product_id"] == item.product_id), None)
    if existing:
        existing["quantity"] += item.quantity
        logger.info(f"Updated quantity for product_id={item.product_id} to {existing['quantity']}")
    else:
        items.append(item.dict())
        logger.info(f"Added new item product_id={item.product_id} to cart")

    save_cart(user_id, cart)
    return cart_totals(cart)


@app.put("/cart/{user_id}/items/{product_id}")
def update_item(user_id: str, product_id: str, update: CartItemUpdate):
    logger.info(f"Update cart item user_id={user_id} product_id={product_id} qty={update.quantity}")
    cart = get_cart(user_id)
    items = cart["items"]

    item = next((i for i in items if i["product_id"] == product_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not in cart")

    if update.quantity <= 0:
        cart["items"] = [i for i in items if i["product_id"] != product_id]
        logger.info(f"Removed product_id={product_id} from cart")
    else:
        item["quantity"] = update.quantity

    save_cart(user_id, cart)
    return cart_totals(cart)


@app.delete("/cart/{user_id}/items/{product_id}")
def remove_item(user_id: str, product_id: str):
    logger.info(f"Remove item user_id={user_id} product_id={product_id}")
    cart = get_cart(user_id)
    cart["items"] = [i for i in cart["items"] if i["product_id"] != product_id]
    save_cart(user_id, cart)
    return cart_totals(cart)


@app.delete("/cart/{user_id}")
def clear_cart(user_id: str):
    logger.info(f"Clear cart user_id={user_id}")
    key = get_cart_key(user_id)
    redis_client.delete(key)
    return {"message": "Cart cleared", "user_id": user_id}


@app.get("/cart/{user_id}/count")
def cart_count(user_id: str):
    cart = get_cart(user_id)
    count = sum(i["quantity"] for i in cart.get("items", []))
    return {"user_id": user_id, "count": count}
