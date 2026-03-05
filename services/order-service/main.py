import os
import uuid
import logging
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Float, Integer, Text, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import httpx

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "order-service",
            "message": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("order-service")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tarun:tarunstore@postgres:5432/orders_db")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8006")
PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8005")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class OrderModel(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    user_email = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    items = Column(JSON, nullable=False)
    subtotal = Column(Float, nullable=False)
    tax = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, default="pending")  # pending, paid, processing, shipped, delivered, cancelled
    payment_id = Column(String)
    shipping_address = Column(Text)
    shipping_city = Column(String)
    shipping_country = Column(String)
    tracking_number = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


Base.metadata.create_all(bind=engine)


class OrderItem(BaseModel):
    product_id: str
    name: str
    brand: str
    price: float
    quantity: int
    image_url: Optional[str] = None


class OrderCreate(BaseModel):
    user_id: str
    user_email: str
    user_name: str
    items: List[OrderItem]
    subtotal: float
    tax: float
    total: float
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_country: Optional[str] = "USA"
    notes: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    user_name: str
    items: list
    subtotal: float
    tax: float
    total: float
    status: str
    payment_id: Optional[str]
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_country: Optional[str]
    tracking_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


app = FastAPI(title="Order Service", version="1.0.0")

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
    return {"status": "healthy", "service": "order-service"}


@app.post("/orders", response_model=OrderResponse)
async def create_order(order: OrderCreate, db: Session = Depends(get_db) if False else None):
    db = SessionLocal()
    try:
        logger.info(f"Creating order for user_id={order.user_id} total=${order.total:.2f} items={len(order.items)}")
        db_order = OrderModel(
            user_id=order.user_id,
            user_email=order.user_email,
            user_name=order.user_name,
            items=[item.dict() for item in order.items],
            subtotal=order.subtotal,
            tax=order.tax,
            total=order.total,
            shipping_address=order.shipping_address,
            shipping_city=order.shipping_city,
            shipping_country=order.shipping_country,
            notes=order.notes,
        )
        db.add(db_order)
        db.commit()
        db.refresh(db_order)
        logger.info(f"Order created id={db_order.id} status={db_order.status}")

        # Notify notification service
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(f"{NOTIFICATION_SERVICE_URL}/notifications/order-created", json={
                    "order_id": db_order.id,
                    "user_email": order.user_email,
                    "user_name": order.user_name,
                    "total": order.total,
                    "items": [item.dict() for item in order.items],
                })
        except Exception as e:
            logger.warning(f"Failed to send order notification: {e}")

        return db_order
    finally:
        db.close()


@app.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: str):
    db = SessionLocal()
    try:
        logger.info(f"Fetching order id={order_id}")
        order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        return order
    finally:
        db.close()


@app.get("/orders/user/{user_id}", response_model=List[OrderResponse])
def get_user_orders(user_id: str, limit: int = 20, offset: int = 0):
    db = SessionLocal()
    try:
        logger.info(f"Fetching orders for user_id={user_id}")
        orders = db.query(OrderModel).filter(
            OrderModel.user_id == user_id
        ).order_by(OrderModel.created_at.desc()).offset(offset).limit(limit).all()
        logger.info(f"Found {len(orders)} orders for user_id={user_id}")
        return orders
    finally:
        db.close()


@app.put("/orders/{order_id}/status")
def update_order_status(order_id: str, update: OrderStatusUpdate):
    db = SessionLocal()
    try:
        valid_statuses = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"]
        if update.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
        logger.info(f"Updating order id={order_id} status={update.status}")
        order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order.status = update.status
        if update.tracking_number:
            order.tracking_number = update.tracking_number
        if update.notes:
            order.notes = update.notes
        order.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(order)
        return order
    finally:
        db.close()


@app.put("/orders/{order_id}/payment")
def set_payment(order_id: str, payment_id: str):
    db = SessionLocal()
    try:
        logger.info(f"Setting payment_id={payment_id} for order_id={order_id}")
        order = db.query(OrderModel).filter(OrderModel.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        order.payment_id = payment_id
        order.status = "paid"
        order.updated_at = datetime.utcnow()
        db.commit()
        return {"message": "Payment recorded", "order_id": order_id, "status": "paid"}
    finally:
        db.close()


@app.get("/orders")
def list_orders(status: Optional[str] = None, limit: int = 50, offset: int = 0):
    db = SessionLocal()
    try:
        q = db.query(OrderModel)
        if status:
            q = q.filter(OrderModel.status == status)
        orders = q.order_by(OrderModel.created_at.desc()).offset(offset).limit(limit).all()
        return orders
    finally:
        db.close()


from fastapi import Depends
