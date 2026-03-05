import os
import uuid
import logging
import json
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, Column, String, Float, Integer, Text, Boolean, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel
import httpx

# Structured JSON logging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "product-service",
            "message": record.getMessage(),
            "dd.trace_id": getattr(record, "dd.trace_id", "0"),
            "dd.span_id": getattr(record, "dd.span_id", "0"),
        }
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger("product-service")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tarun:tarunstore@postgres:5432/products_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ProductModel(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    brand = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text)
    price = Column(Float, nullable=False)
    original_price = Column(Float)
    image_url = Column(String)
    images = Column(JSON, default=list)
    stock = Column(Integer, default=100)
    rating = Column(Float, default=4.5)
    review_count = Column(Integer, default=0)
    tags = Column(JSON, default=list)
    is_featured = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ReviewModel(Base):
    __tablename__ = "reviews"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


class ProductCreate(BaseModel):
    name: str
    brand: str
    category: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = []
    stock: Optional[int] = 100
    tags: Optional[List[str]] = []
    is_featured: Optional[bool] = False


class ProductResponse(BaseModel):
    id: str
    name: str
    brand: str
    category: str
    description: Optional[str]
    price: float
    original_price: Optional[float]
    image_url: Optional[str]
    images: Optional[List[str]]
    stock: int
    rating: float
    review_count: int
    tags: Optional[List[str]]
    is_featured: bool
    is_active: bool

    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    user_id: str
    user_name: str
    rating: int
    comment: Optional[str] = None


app = FastAPI(title="Product Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = datetime.utcnow()
    response = await call_next(request)
    duration = (datetime.utcnow() - start).total_seconds() * 1000
    logger.info(f"{request.method} {request.url.path} {response.status_code} {duration:.2f}ms")
    return response


@app.on_event("startup")
def seed_products():
    db = SessionLocal()
    if db.query(ProductModel).count() == 0:
        logger.info("Seeding luxury products database")
        products = [
            {"name": "Dionysus GG Supreme Mini Bag", "brand": "Gucci", "category": "bags",
             "price": 2890.0, "original_price": 3200.0,
             "description": "Iconic GG Supreme canvas mini bag with antique gold-toned hardware and iconic tiger head closure.",
             "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
             "images": ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"],
             "tags": ["luxury", "handbag", "designer"], "is_featured": True, "rating": 4.8, "review_count": 124},
            {"name": "Neverfull MM Tote", "brand": "Louis Vuitton", "category": "bags",
             "price": 1560.0,
             "description": "The Neverfull MM is a spacious and supple tote in iconic Monogram canvas.",
             "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
             "images": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"],
             "tags": ["luxury", "tote", "designer"], "is_featured": True, "rating": 4.9, "review_count": 342},
            {"name": "Submariner Date", "brand": "Rolex", "category": "watches",
             "price": 14150.0,
             "description": "The Submariner Date is the quintessential divers' watch, waterproof to 300 metres.",
             "image_url": "https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600",
             "images": ["https://images.unsplash.com/photo-1587836374828-4dbafa94cf0e?w=600"],
             "tags": ["luxury", "watch", "diving"], "is_featured": True, "rating": 5.0, "review_count": 89},
            {"name": "Birkin 30 Togo Leather", "brand": "Hermes", "category": "bags",
             "price": 11400.0,
             "description": "The Birkin 30 in Togo leather with Palladium hardware. A timeless investment piece.",
             "image_url": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600",
             "images": ["https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=600"],
             "tags": ["luxury", "iconic", "investment"], "is_featured": True, "rating": 5.0, "review_count": 56},
            {"name": "Classic Flap Bag Medium", "brand": "Chanel", "category": "bags",
             "price": 8800.0,
             "description": "The iconic Classic Flap in caviar leather with gold hardware. Timeless elegance.",
             "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600",
             "images": ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"],
             "tags": ["luxury", "iconic", "quilted"], "is_featured": True, "rating": 4.9, "review_count": 213},
            {"name": "Love Bracelet 18K Gold", "brand": "Cartier", "category": "jewelry",
             "price": 6750.0,
             "description": "Iconic screwdriver bracelet in 18K yellow gold. Symbol of eternal love.",
             "image_url": "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600",
             "images": ["https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600"],
             "tags": ["luxury", "gold", "jewelry"], "is_featured": True, "rating": 4.9, "review_count": 178},
            {"name": "iPhone 15 Pro Max 256GB", "brand": "Apple", "category": "electronics",
             "price": 1199.0, "original_price": 1299.0,
             "description": "Titanium. So strong. So light. So Pro. A17 Pro chip. 48MP camera system.",
             "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600",
             "images": ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600"],
             "tags": ["tech", "smartphone", "premium"], "is_featured": True, "rating": 4.8, "review_count": 892},
            {"name": "MacBook Pro 16\" M3 Max", "brand": "Apple", "category": "electronics",
             "price": 3499.0,
             "description": "M3 Max chip with 16-core CPU, 40-core GPU. Up to 128GB unified memory.",
             "image_url": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600",
             "images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600"],
             "tags": ["tech", "laptop", "professional"], "is_featured": False, "rating": 4.9, "review_count": 445},
            {"name": "Daytona Chronograph", "brand": "Rolex", "category": "watches",
             "price": 19000.0,
             "description": "The Cosmograph Daytona was designed to meet the needs of professional racing drivers.",
             "image_url": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600",
             "images": ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600"],
             "tags": ["luxury", "chronograph", "racing"], "is_featured": False, "rating": 5.0, "review_count": 67},
            {"name": "Kelly 28 Epsom Leather", "brand": "Hermes", "category": "bags",
             "price": 9800.0,
             "description": "The Kelly 28 in structured Epsom leather. A testament to Hermes savoir-faire.",
             "image_url": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600",
             "images": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"],
             "tags": ["luxury", "structured", "iconic"], "is_featured": False, "rating": 4.9, "review_count": 43},
            {"name": "Ace Sneakers", "brand": "Gucci", "category": "shoes",
             "price": 650.0,
             "description": "Iconic Ace sneaker in leather with Web detail. The ultimate luxury casual.",
             "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
             "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"],
             "tags": ["shoes", "sneakers", "luxury"], "is_featured": False, "rating": 4.7, "review_count": 234},
            {"name": "Parfum N°5", "brand": "Chanel", "category": "fragrance",
             "price": 185.0,
             "description": "The world's most iconic fragrance. Floral aldehyde with jasmine and rose.",
             "image_url": "https://images.unsplash.com/photo-1541643600914-78b084683702?w=600",
             "images": ["https://images.unsplash.com/photo-1541643600914-78b084683702?w=600"],
             "tags": ["fragrance", "iconic", "floral"], "is_featured": False, "rating": 4.8, "review_count": 567},
            {"name": "AirPods Pro 2nd Gen", "brand": "Apple", "category": "electronics",
             "price": 249.0,
             "description": "Active Noise Cancellation, Adaptive Transparency, Personalized Spatial Audio.",
             "image_url": "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=600",
             "images": ["https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=600"],
             "tags": ["tech", "audio", "wireless"], "is_featured": False, "rating": 4.7, "review_count": 1203},
            {"name": "Diamond Tennis Necklace", "brand": "Cartier", "category": "jewelry",
             "price": 24500.0,
             "description": "18K white gold necklace set with brilliant-cut diamonds. Total 5.5 carats.",
             "image_url": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600",
             "images": ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600"],
             "tags": ["jewelry", "diamonds", "necklace"], "is_featured": True, "rating": 5.0, "review_count": 28},
            {"name": "Twilly d'Hermes Silk Scarf", "brand": "Hermes", "category": "accessories",
             "price": 185.0,
             "description": "Playful and chic silk twilly. 100% silk with hand-rolled edges.",
             "image_url": "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600",
             "images": ["https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600"],
             "tags": ["silk", "scarf", "accessories"], "is_featured": False, "rating": 4.6, "review_count": 145},
            {"name": "Apple Watch Ultra 2", "brand": "Apple", "category": "electronics",
             "price": 799.0,
             "description": "The most rugged Apple Watch. Titanium case, 60-hour battery, precision GPS.",
             "image_url": "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600",
             "images": ["https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=600"],
             "tags": ["tech", "watch", "sport"], "is_featured": False, "rating": 4.8, "review_count": 334},
            {"name": "Monogram Belt 35mm", "brand": "Louis Vuitton", "category": "accessories",
             "price": 495.0,
             "description": "Classic LV monogram belt in 35mm width with gold-tone buckle.",
             "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
             "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600"],
             "tags": ["belt", "accessories", "monogram"], "is_featured": False, "rating": 4.7, "review_count": 189},
            {"name": "iPad Pro 13\" M4", "brand": "Apple", "category": "electronics",
             "price": 1299.0,
             "description": "The thinnest Apple product ever. M4 chip, Ultra Retina XDR OLED display.",
             "image_url": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600",
             "images": ["https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600"],
             "tags": ["tech", "tablet", "professional"], "is_featured": False, "rating": 4.8, "review_count": 278},
        ]
        for p in products:
            db.add(ProductModel(**p))
        db.commit()
        logger.info(f"Seeded {len(products)} products")
    db.close()


@app.get("/health")
def health():
    return {"status": "healthy", "service": "product-service"}


@app.get("/products", response_model=List[ProductResponse])
def get_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    featured: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    logger.info(f"Fetching products category={category} brand={brand} featured={featured}")
    q = db.query(ProductModel).filter(ProductModel.is_active == True)
    if category:
        q = q.filter(ProductModel.category == category)
    if brand:
        q = q.filter(ProductModel.brand == brand)
    if featured is not None:
        q = q.filter(ProductModel.is_featured == featured)
    if min_price is not None:
        q = q.filter(ProductModel.price >= min_price)
    if max_price is not None:
        q = q.filter(ProductModel.price <= max_price)
    products = q.offset(offset).limit(limit).all()
    logger.info(f"Returning {len(products)} products")
    return products


@app.get("/products/search")
def search_products(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    logger.info(f"Searching products q={q}")
    results = db.query(ProductModel).filter(
        ProductModel.is_active == True,
        (ProductModel.name.ilike(f"%{q}%")) |
        (ProductModel.brand.ilike(f"%{q}%")) |
        (ProductModel.description.ilike(f"%{q}%")) |
        (ProductModel.category.ilike(f"%{q}%"))
    ).limit(20).all()
    logger.info(f"Search returned {len(results)} results")
    return results


@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)):
    logger.info(f"Fetching product id={product_id}")
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.post("/products", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    logger.info(f"Creating product name={product.name} brand={product.brand}")
    db_product = ProductModel(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.get("/brands")
def get_brands(db: Session = Depends(get_db)):
    brands = db.query(ProductModel.brand).distinct().all()
    return [b[0] for b in brands]


@app.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(ProductModel.category).distinct().all()
    return [c[0] for c in cats]


@app.get("/products/{product_id}/reviews")
def get_reviews(product_id: str, db: Session = Depends(get_db)):
    reviews = db.query(ReviewModel).filter(ReviewModel.product_id == product_id).all()
    return reviews


@app.post("/products/{product_id}/reviews")
def add_review(product_id: str, review: ReviewCreate, db: Session = Depends(get_db)):
    logger.info(f"Adding review to product={product_id} rating={review.rating}")
    product = db.query(ProductModel).filter(ProductModel.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db_review = ReviewModel(product_id=product_id, **review.dict())
    db.add(db_review)
    total = product.rating * product.review_count + review.rating
    product.review_count += 1
    product.rating = round(total / product.review_count, 1)
    db.commit()
    db.refresh(db_review)
    return db_review
