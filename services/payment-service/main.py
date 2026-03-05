import os
import uuid
import logging
import json
import random
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

class JSONFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "payment-service",
            "message": record.getMessage(),
        })

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("payment-service")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

ORDER_SERVICE_URL = os.getenv("ORDER_SERVICE_URL", "http://order-service:8004")

# In-memory storage for demo (would be DB in production)
transactions = {}


class PaymentRequest(BaseModel):
    order_id: str
    user_id: str
    amount: float
    currency: str = "USD"
    payment_method: str = "card"  # card, paypal, apple_pay, google_pay
    card_last_four: Optional[str] = None
    card_brand: Optional[str] = None


class RefundRequest(BaseModel):
    transaction_id: str
    amount: Optional[float] = None
    reason: Optional[str] = None


app = FastAPI(title="Payment Service", version="1.0.0")

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
    return {"status": "healthy", "service": "payment-service"}


@app.post("/payments/process")
async def process_payment(payment: PaymentRequest):
    logger.info(f"Processing payment order_id={payment.order_id} amount=${payment.amount:.2f} method={payment.payment_method}")

    # Simulate payment processing delay and logic
    transaction_id = str(uuid.uuid4())

    # Simulate 95% success rate for demo
    success = random.random() > 0.05

    if not success:
        logger.warning(f"Payment declined order_id={payment.order_id} amount=${payment.amount:.2f}")
        raise HTTPException(status_code=402, detail="Payment declined. Please check your payment details.")

    transaction = {
        "id": transaction_id,
        "order_id": payment.order_id,
        "user_id": payment.user_id,
        "amount": payment.amount,
        "currency": payment.currency,
        "payment_method": payment.payment_method,
        "card_last_four": payment.card_last_four or "****",
        "card_brand": payment.card_brand or "Visa",
        "status": "completed",
        "created_at": datetime.utcnow().isoformat(),
    }
    transactions[transaction_id] = transaction

    logger.info(f"Payment successful transaction_id={transaction_id} order_id={payment.order_id} amount=${payment.amount:.2f}")

    # Notify order service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.put(
                f"{ORDER_SERVICE_URL}/orders/{payment.order_id}/payment",
                params={"payment_id": transaction_id}
            )
    except Exception as e:
        logger.warning(f"Failed to update order status: {e}")

    return {
        "success": True,
        "transaction_id": transaction_id,
        "order_id": payment.order_id,
        "amount": payment.amount,
        "currency": payment.currency,
        "status": "completed",
        "message": "Payment processed successfully",
    }


@app.get("/payments/{transaction_id}")
def get_transaction(transaction_id: str):
    logger.info(f"Fetching transaction id={transaction_id}")
    txn = transactions.get(transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@app.post("/payments/refund")
def process_refund(refund: RefundRequest):
    logger.info(f"Processing refund transaction_id={refund.transaction_id} reason={refund.reason}")
    txn = transactions.get(refund.transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn["status"] == "refunded":
        raise HTTPException(status_code=400, detail="Already refunded")

    refund_amount = refund.amount or txn["amount"]
    refund_id = str(uuid.uuid4())

    txn["status"] = "refunded"
    txn["refund_id"] = refund_id
    txn["refund_amount"] = refund_amount
    txn["refund_reason"] = refund.reason
    txn["refunded_at"] = datetime.utcnow().isoformat()

    logger.info(f"Refund processed refund_id={refund_id} amount=${refund_amount:.2f}")
    return {
        "success": True,
        "refund_id": refund_id,
        "transaction_id": refund.transaction_id,
        "refund_amount": refund_amount,
        "status": "refunded",
    }


@app.get("/payments/user/{user_id}")
def get_user_transactions(user_id: str):
    logger.info(f"Fetching transactions for user_id={user_id}")
    user_txns = [t for t in transactions.values() if t["user_id"] == user_id]
    return user_txns
