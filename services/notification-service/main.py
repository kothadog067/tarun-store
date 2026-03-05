import os
import uuid
import logging
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "notification-service",
            "message": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("notification-service")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# In-memory notification log (would use a real email provider in prod: SES, SendGrid, etc.)
notification_log = []


class OrderCreatedNotification(BaseModel):
    order_id: str
    user_email: str
    user_name: str
    total: float
    items: list


class ShippingNotification(BaseModel):
    order_id: str
    user_email: str
    user_name: str
    tracking_number: str
    carrier: str = "FedEx"


class EmailNotification(BaseModel):
    to: str
    subject: str
    body: str


class SMSNotification(BaseModel):
    phone: str
    message: str


app = FastAPI(title="Notification Service", version="1.0.0")

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


def record_notification(type: str, recipient: str, subject: str, body: str, metadata: dict = {}):
    entry = {
        "id": str(uuid.uuid4()),
        "type": type,
        "recipient": recipient,
        "subject": subject,
        "body": body,
        "metadata": metadata,
        "status": "sent",
        "sent_at": datetime.utcnow().isoformat(),
    }
    notification_log.append(entry)
    logger.info(f"Notification sent type={type} recipient={recipient} subject={subject}")
    return entry


@app.get("/health")
def health():
    return {"status": "healthy", "service": "notification-service"}


@app.post("/notifications/order-created")
def notify_order_created(notification: OrderCreatedNotification):
    logger.info(f"Sending order confirmation order_id={notification.order_id} to={notification.user_email}")
    item_lines = "\n".join([f"  - {i['name']} x{i['quantity']} @ ${i['price']:.2f}" for i in notification.items])
    body = f"""
Dear {notification.user_name},

Thank you for your order at Tarun's Store!

Order ID: {notification.order_id}
Items:
{item_lines}

Total: ${notification.total:.2f}

We'll send you a shipping confirmation once your order is on its way.

Best regards,
Tarun's Store
    """.strip()

    entry = record_notification(
        type="email",
        recipient=notification.user_email,
        subject=f"Order Confirmation #{notification.order_id[:8].upper()} - Tarun's Store",
        body=body,
        metadata={"order_id": notification.order_id, "total": notification.total}
    )
    return {"success": True, "notification_id": entry["id"]}


@app.post("/notifications/shipping")
def notify_shipping(notification: ShippingNotification):
    logger.info(f"Sending shipping notification order_id={notification.order_id} tracking={notification.tracking_number}")
    body = f"""
Dear {notification.user_name},

Great news! Your order #{notification.order_id[:8].upper()} has shipped.

Tracking Number: {notification.tracking_number}
Carrier: {notification.carrier}

You can track your package at {notification.carrier.lower()}.com

Best regards,
Tarun's Store
    """.strip()

    entry = record_notification(
        type="email",
        recipient=notification.user_email,
        subject=f"Your Order Has Shipped! #{notification.order_id[:8].upper()}",
        body=body,
        metadata={"order_id": notification.order_id, "tracking": notification.tracking_number}
    )
    return {"success": True, "notification_id": entry["id"]}


@app.post("/notifications/email")
def send_email(notification: EmailNotification):
    logger.info(f"Sending custom email to={notification.to} subject={notification.subject}")
    entry = record_notification(
        type="email",
        recipient=notification.to,
        subject=notification.subject,
        body=notification.body,
    )
    return {"success": True, "notification_id": entry["id"]}


@app.post("/notifications/sms")
def send_sms(notification: SMSNotification):
    logger.info(f"Sending SMS to={notification.phone}")
    entry = record_notification(
        type="sms",
        recipient=notification.phone,
        subject="SMS",
        body=notification.message,
    )
    return {"success": True, "notification_id": entry["id"]}


@app.get("/notifications")
def list_notifications(limit: int = 50, offset: int = 0):
    total = len(notification_log)
    items = notification_log[offset:offset + limit]
    return {"total": total, "items": list(reversed(items))}


@app.get("/notifications/user/{user_email}")
def user_notifications(user_email: str):
    user_notifs = [n for n in notification_log if n["recipient"] == user_email]
    return list(reversed(user_notifs))
