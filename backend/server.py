from fastapi import FastAPI, APIRouter, Depends, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

MOCK_HOTELS = [
    {
        "id": 1001,
        "name": "Azure Bay Resort & Spa",
        "city": "Miami Beach",
        "country": "United States",
        "description": "Luxury beachfront resort with stunning ocean views",
        "price": 299.0,
        "currency": "USD",
        "rating": 9.2,
        "review_count": 1834,
        "image_urls": [
            "https://images.unsplash.com/photo-1724598571320-7d2b5584cff6?w=800",
            "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=800",
            "https://images.unsplash.com/photo-1770017408222-dc83f61d9725?w=800"
        ],
        "amenities": ["Free WiFi", "Pool", "Spa", "Restaurant", "Beach Access", "Gym"]
    },
    {
        "id": 1002,
        "name": "Sunset Paradise Hotel",
        "city": "Los Angeles",
        "country": "United States",
        "description": "Modern hotel in the heart of the city",
        "price": 199.0,
        "currency": "USD",
        "rating": 8.5,
        "review_count": 892,
        "image_urls": [
            "https://images.unsplash.com/photo-1763110805060-80dbead1f9d3?w=800",
            "https://images.unsplash.com/photo-1766928210443-0be92ed5884a?w=800",
            "https://images.unsplash.com/photo-1769766407883-1645a93eed40?w=800"
        ],
        "amenities": ["Free WiFi", "Pool", "Parking", "Restaurant"]
    },
    {
        "id": 1003,
        "name": "Grand Palace Hotel",
        "city": "New York",
        "country": "United States",
        "description": "Elegant hotel near Central Park",
        "price": 349.0,
        "currency": "USD",
        "rating": 9.0,
        "review_count": 2156,
        "image_urls": [
            "https://images.unsplash.com/photo-1724598571320-7d2b5584cff6?w=800"
        ],
        "amenities": ["Free WiFi", "Concierge", "Restaurant", "Bar", "Room Service"]
    },
    {
        "id": 1004,
        "name": "Coastal Breeze Inn",
        "city": "San Diego",
        "country": "United States",
        "description": "Cozy inn with ocean views",
        "price": 159.0,
        "currency": "USD",
        "rating": 8.8,
        "review_count": 654,
        "image_urls": [
            "https://images.unsplash.com/photo-1763110805060-80dbead1f9d3?w=800"
        ],
        "amenities": ["Free WiFi", "Breakfast", "Parking"]
    },
    {
        "id": 1005,
        "name": "Mountain View Lodge",
        "city": "Denver",
        "country": "United States",
        "description": "Rustic lodge with mountain views",
        "price": 179.0,
        "currency": "USD",
        "rating": 8.7,
        "review_count": 423,
        "image_urls": [
            "https://images.unsplash.com/photo-1770017408222-dc83f61d9725?w=800"
        ],
        "amenities": ["Free WiFi", "Fireplace", "Hiking Trails", "Restaurant"]
    }
]

class HotelSearchRequest(BaseModel):
    destination: str
    check_in: str
    check_out: str
    num_adults: int = 1
    num_children: int = 0
    num_rooms: int = 1

class HotelInfo(BaseModel):
    id: int
    name: str
    city: str
    country: str
    description: str
    price: float
    currency: str
    rating: float
    review_count: int
    image_urls: List[str]
    amenities: List[str]

class BookingRequest(BaseModel):
    hotel_id: int
    check_in: str
    check_out: str
    guest_first_name: str
    guest_last_name: str
    guest_email: EmailStr
    num_adults: int
    num_children: int = 0
    total_price: float

class BookingResponse(BaseModel):
    booking_id: str
    hotel_id: int
    hotel_name: str
    status: str
    check_in: str
    check_out: str
    total_price: float
    created_at: str

class SessionRequest(BaseModel):
    session_id: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str

class PaymentCheckoutRequest(BaseModel):
    booking_id: str
    origin_url: str

async def get_current_user(authorization: Optional[str] = Header(None), request: Request = None) -> Dict:
    session_token = None
    
    if request and "session_token" in request.cookies:
        session_token = request.cookies.get("session_token")
    elif authorization and authorization.startswith("Bearer "):
        session_token = authorization.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

@api_router.post("/auth/session")
async def process_session(session_req: SessionRequest, response: JSONResponse = None):
    try:
        async with httpx.AsyncClient() as client:
            headers = {"X-Session-ID": session_req.session_id}
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers=headers,
                timeout=10.0
            )
            resp.raise_for_status()
            user_data = resp.json()
        
        user_id = user_data["id"]
        existing_user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        
        if not existing_user:
            user_doc = {
                "user_id": user_id,
                "email": user_data["email"],
                "name": user_data["name"],
                "picture": user_data["picture"],
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(user_doc)
        else:
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "name": user_data["name"],
                    "picture": user_data["picture"]
                }}
            )
        
        session_token = user_data["session_token"]
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc)
        }
        await db.user_sessions.insert_one(session_doc)
        
        user_response = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data["picture"],
            "session_token": session_token
        }
        
        return user_response
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing session: {str(e)}")

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: Dict = Depends(get_current_user)):
    return UserResponse(**user)

@api_router.post("/auth/logout")
async def logout(request: Request, user: Dict = Depends(get_current_user)):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    return {"message": "Logged out successfully"}

@api_router.post("/hotels/search", response_model=List[HotelInfo])
async def search_hotels(search_request: HotelSearchRequest):
    filtered_hotels = [h for h in MOCK_HOTELS if search_request.destination.lower() in h["city"].lower() or search_request.destination.lower() in h["country"].lower()]
    
    if not filtered_hotels:
        filtered_hotels = MOCK_HOTELS
    
    return [HotelInfo(**hotel) for hotel in filtered_hotels]

@api_router.get("/hotels/{hotel_id}", response_model=HotelInfo)
async def get_hotel_details(hotel_id: int):
    hotel = next((h for h in MOCK_HOTELS if h["id"] == hotel_id), None)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    return HotelInfo(**hotel)

@api_router.post("/bookings/create", response_model=BookingResponse)
async def create_booking(booking_request: BookingRequest, user: Dict = Depends(get_current_user)):
    hotel = next((h for h in MOCK_HOTELS if h["id"] == booking_request.hotel_id), None)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    
    booking_doc = {
        "booking_id": booking_id,
        "user_id": user["user_id"],
        "hotel_id": booking_request.hotel_id,
        "hotel_name": hotel["name"],
        "check_in": booking_request.check_in,
        "check_out": booking_request.check_out,
        "guest_first_name": booking_request.guest_first_name,
        "guest_last_name": booking_request.guest_last_name,
        "guest_email": booking_request.guest_email,
        "num_adults": booking_request.num_adults,
        "num_children": booking_request.num_children,
        "total_price": booking_request.total_price,
        "status": "pending_payment",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_doc)
    
    return BookingResponse(
        booking_id=booking_id,
        hotel_id=booking_request.hotel_id,
        hotel_name=hotel["name"],
        status="pending_payment",
        check_in=booking_request.check_in,
        check_out=booking_request.check_out,
        total_price=booking_request.total_price,
        created_at=booking_doc["created_at"]
    )

@api_router.get("/bookings", response_model=List[BookingResponse])
async def get_user_bookings(user: Dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return [BookingResponse(**booking) for booking in bookings]

@api_router.post("/payments/checkout/session", response_model=CheckoutSessionResponse)
async def create_checkout_session(payment_req: PaymentCheckoutRequest, user: Dict = Depends(get_current_user), request: Request = None):
    booking_doc = await db.bookings.find_one({"booking_id": payment_req.booking_id}, {"_id": 0})
    if not booking_doc:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking_doc["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    host_url = payment_req.origin_url
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/bookings"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(booking_doc["total_price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_doc["booking_id"],
            "user_id": user["user_id"],
            "hotel_name": booking_doc["hotel_name"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    payment_doc = {
        "payment_id": f"payment_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "booking_id": booking_doc["booking_id"],
        "user_id": user["user_id"],
        "amount": booking_doc["total_price"],
        "currency": "usd",
        "payment_status": "pending",
        "status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(payment_doc)
    
    return session

@api_router.get("/payments/checkout/status/{session_id}", response_model=CheckoutStatusResponse)
async def get_checkout_status(session_id: str, user: Dict = Depends(get_current_user)):
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    webhook_url = "https://example.com/webhook"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    payment_doc = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if payment_doc:
        if checkout_status.payment_status == "paid" and payment_doc["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "status": "completed"}}
            )
            
            await db.bookings.update_one(
                {"booking_id": payment_doc["booking_id"]},
                {"$set": {"status": "confirmed"}}
            )
    
    return checkout_status

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    webhook_url = str(request.base_url).rstrip('/') + "/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.event_type == "checkout.session.completed":
            session_id = webhook_response.session_id
            payment_doc = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
            
            if payment_doc and payment_doc["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "status": "completed"}}
                )
                
                await db.bookings.update_one(
                    {"booking_id": payment_doc["booking_id"]},
                    {"$set": {"status": "confirmed"}}
                )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()