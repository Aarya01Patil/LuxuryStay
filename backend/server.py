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

BOOKING_API_KEY = os.environ.get('BOOKING_API_KEY', 'YOUR_API_KEY_HERE')
BOOKING_AFFILIATE_ID = os.environ.get('BOOKING_AFFILIATE_ID', 'YOUR_AFFILIATE_ID_HERE')
BOOKING_API_BASE_URL = os.environ.get('BOOKING_API_BASE_URL', 'https://demandapi-sandbox.booking.com/3.1')
USE_REAL_API = BOOKING_API_KEY != 'YOUR_API_KEY_HERE' and BOOKING_API_KEY != ''

CITY_ID_MAPPING = {
    "miami": -1548846,
    "miami beach": -1548846,
    "new york": -2601889,
    "los angeles": -1752729,
    "san diego": -1768774,
    "denver": -1712385,
    "amsterdam": -2140479,
    "london": -2601889,
    "paris": -1456928,
    "rome": -126693,
    "barcelona": -372490,
    "berlin": -1746443,
    "tokyo": -246227,
    "singapore": -73635,
    "bangkok": -3414440,
    "dubai": -782831,
    "las vegas": -1771291,
    "orlando": -1771217,
    "san francisco": -1746462,
    "chicago": -1743924,
    "boston": -2073502,
    "seattle": -1771260
}

MOCK_HOTELS = [
    {
        "id": 1001,
        "name": "Azure Bay Resort & Spa",
        "city": "Mumbai",
        "country": "India",
        "description": "Luxury beachfront resort with stunning ocean views",
        "price": 24999.0,
        "currency": "INR",
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
        "city": "Goa",
        "country": "India",
        "description": "Modern hotel in the heart of the city",
        "price": 16599.0,
        "currency": "INR",
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
        "city": "Delhi",
        "country": "India",
        "description": "Elegant hotel in premium location",
        "price": 29099.0,
        "currency": "INR",
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
        "city": "Chennai",
        "country": "India",
        "description": "Cozy inn with ocean views",
        "price": 13259.0,
        "currency": "INR",
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
        "city": "Manali",
        "country": "India",
        "description": "Rustic lodge with mountain views",
        "price": 14919.0,
        "currency": "INR",
        "rating": 8.7,
        "review_count": 423,
        "image_urls": [
            "https://images.unsplash.com/photo-1770017408222-dc83f61d9725?w=800"
        ],
        "amenities": ["Free WiFi", "Fireplace", "Hiking Trails", "Restaurant"]
    }
]

from pathlib import Path
extended_hotels_file = Path(__file__).parent / 'extended_hotels.py'
if extended_hotels_file.exists():
    from extended_hotels import EXTENDED_HOTELS
    MOCK_HOTELS.extend(EXTENDED_HOTELS)

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

async def call_booking_api(endpoint: str, method: str = "GET", payload: Dict = None) -> Any:
    """Make authenticated API calls to Booking.com"""
    if not USE_REAL_API:
        raise HTTPException(status_code=503, detail="Booking.com API not configured")
    
    headers = {
        "Authorization": f"Bearer {BOOKING_API_KEY}",
        "X-Affiliate-Id": BOOKING_AFFILIATE_ID,
        "Content-Type": "application/json"
    }
    
    url = f"{BOOKING_API_BASE_URL}/{endpoint}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if method == "POST":
                response = await client.post(url, json=payload, headers=headers)
            else:
                response = await client.get(url, headers=headers)
            
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Booking.com API error {e.response.status_code}: {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Booking.com API error: {e.response.text}"
            )
        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling Booking.com: {str(e)}")
            raise HTTPException(status_code=503, detail="Unable to reach Booking.com API")

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

@api_router.get("/status")
async def api_status():
    """Check API configuration status"""
    return {
        "booking_api_configured": USE_REAL_API,
        "booking_api_mode": "real" if USE_REAL_API else "mock",
        "booking_api_url": BOOKING_API_BASE_URL if USE_REAL_API else "N/A",
        "supported_cities": len(CITY_ID_MAPPING),
        "stripe_configured": bool(os.environ.get('STRIPE_API_KEY')),
        "message": "Booking.com API credentials configured" if USE_REAL_API else "Using mock hotel data. Add BOOKING_API_KEY and BOOKING_AFFILIATE_ID to .env to enable real API"
    }

@api_router.post("/hotels/search", response_model=List[HotelInfo])
async def search_hotels(search_request: HotelSearchRequest):
    """Search for hotels using Booking.com API or mock data"""
    
    if USE_REAL_API:
        city_id = CITY_ID_MAPPING.get(search_request.destination.lower())
        
        if not city_id:
            available_cities = ", ".join(list(CITY_ID_MAPPING.keys())[:10])
            raise HTTPException(
                status_code=400,
                detail=f"City '{search_request.destination}' not supported. Try: {available_cities}"
            )
        
        cached = await db.hotel_cache.find_one({
            "destination": search_request.destination.lower(),
            "check_in": search_request.check_in,
            "check_out": search_request.check_out,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        }, {"_id": 0})
        
        if cached:
            logger.info(f"Returning cached results for {search_request.destination}")
            return [HotelInfo(**h) for h in cached["results"]]
        
        payload = {
            "booker": {
                "country": "us",
                "platform": "desktop"
            },
            "checkin": search_request.check_in,
            "checkout": search_request.check_out,
            "city": city_id,
            "guests": {
                "number_of_adults": search_request.num_adults,
                "number_of_children": search_request.num_children,
                "number_of_rooms": search_request.num_rooms
            },
            "extras": ["products", "extra_charges", "images"]
        }
        
        try:
            response_data = await call_booking_api("accommodations/search", "POST", payload)
            
            hotels = []
            for accommodation in response_data.get("data", [])[:15]:
                try:
                    price_data = accommodation.get("price", {})
                    price = float(price_data.get("total", 0)) if price_data else 0
                    
                    hotel = HotelInfo(
                        id=accommodation.get("id", 0),
                        name=accommodation.get("name", "Unknown Hotel"),
                        city=search_request.destination,
                        country=accommodation.get("country", ""),
                        description=(accommodation.get("description", "Beautiful hotel")[:200] + "..."),
                        price=price,
                        currency=accommodation.get("currency", {}).get("accommodation", "USD"),
                        rating=float(accommodation.get("review_score", 0)),
                        review_count=accommodation.get("review_count", 0),
                        image_urls=accommodation.get("image_urls", [])[:4],
                        amenities=accommodation.get("facilities", [])[:6]
                    )
                    hotels.append(hotel)
                except Exception as e:
                    logger.error(f"Error parsing hotel data: {str(e)}")
                    continue
            
            if hotels:
                cache_doc = {
                    "destination": search_request.destination.lower(),
                    "check_in": search_request.check_in,
                    "check_out": search_request.check_out,
                    "results": [h.dict() for h in hotels],
                    "cached_at": datetime.now(timezone.utc),
                    "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
                }
                await db.hotel_cache.insert_one(cache_doc)
            
            return hotels
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error calling Booking.com API: {str(e)}")
            logger.info("Falling back to mock data")
    
    filtered_hotels = [h for h in MOCK_HOTELS if search_request.destination.lower() in h["city"].lower() or search_request.destination.lower() in h["country"].lower()]
    
    if not filtered_hotels:
        filtered_hotels = MOCK_HOTELS
    
    return [HotelInfo(**hotel) for hotel in filtered_hotels]

@api_router.get("/hotels/{hotel_id}", response_model=HotelInfo)
async def get_hotel_details(hotel_id: int):
    """Get detailed hotel information from Booking.com or mock data"""
    
    if USE_REAL_API:
        cached = await db.hotel_details_cache.find_one({
            "hotel_id": hotel_id,
            "expires_at": {"$gt": datetime.now(timezone.utc)}
        }, {"_id": 0})
        
        if cached:
            logger.info(f"Returning cached details for hotel {hotel_id}")
            return HotelInfo(**cached["hotel_data"])
        
        try:
            response_data = await call_booking_api(f"accommodations/{hotel_id}")
            
            accommodation = response_data.get("data", {})
            
            price_data = accommodation.get("price", {})
            price = float(price_data.get("total", 0)) if price_data else 0
            
            hotel = HotelInfo(
                id=accommodation.get("id", hotel_id),
                name=accommodation.get("name", "Unknown Hotel"),
                city=accommodation.get("city", ""),
                country=accommodation.get("country", ""),
                description=accommodation.get("description", ""),
                price=price,
                currency=accommodation.get("currency", {}).get("accommodation", "USD"),
                rating=float(accommodation.get("review_score", 0)),
                review_count=accommodation.get("review_count", 0),
                image_urls=accommodation.get("image_urls", []),
                amenities=accommodation.get("facilities", [])
            )
            
            cache_doc = {
                "hotel_id": hotel_id,
                "hotel_data": hotel.dict(),
                "cached_at": datetime.now(timezone.utc),
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=6)
            }
            await db.hotel_details_cache.insert_one(cache_doc)
            
            return hotel
            
        except HTTPException as e:
            if e.status_code == 404:
                logger.info(f"Hotel {hotel_id} not found on Booking.com, using mock data")
            else:
                raise
    
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