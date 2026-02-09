# Booking.com API Integration Guide

## Overview
This guide explains how to integrate the real Booking.com Demand API into your Vibrant Escape hotel booking platform.

---

## Step 1: Get Booking.com API Credentials

### 1.1 Sign Up for Affiliate Program
1. Visit https://www.booking.com/affiliate
2. Click "Join Now" or "Sign Up"
3. Complete the registration:
   - Company/Personal details
   - Website information (use your app URL)
   - Payment details for commissions
4. Wait for approval (usually 1-2 business days)

### 1.2 Generate API Credentials
Once approved:
1. Login to Affiliate Partner Centre: https://www.booking.com/affiliate
2. Navigate to: **Settings** → **API Configuration**
3. Click **"Generate API Key"**
4. **CRITICAL**: Copy the API key immediately (displayed only once!)
   - Format: Long alphanumeric string (e.g., `abc123def456...`)
5. Find your **Affiliate ID** in Account Settings
   - Format: Numeric ID (e.g., `123456`)

### 1.3 Sandbox Access
Booking.com provides sandbox environment for testing:
- **Sandbox URL**: `https://demandapi-sandbox.booking.com/3.1`
- **Production URL**: `https://demandapi.booking.com/3.1`
- Same credentials work for both

---

## Step 2: Configure Credentials in Your App

### 2.1 Update Backend Environment Variables

Edit `/app/backend/.env` and add:

```bash
# Booking.com API Configuration
BOOKING_API_KEY=your_actual_api_key_here
BOOKING_AFFILIATE_ID=your_affiliate_id_here
BOOKING_API_BASE_URL=https://demandapi-sandbox.booking.com/3.1
```

**For Production:**
```bash
BOOKING_API_BASE_URL=https://demandapi.booking.com/3.1
```

### 2.2 Never Commit Credentials
Ensure `.env` is in `.gitignore`:
```bash
# Check if .env is ignored
grep ".env" /app/backend/.gitignore

# If not, add it
echo ".env" >> /app/backend/.gitignore
```

---

## Step 3: Update Backend Code

### 3.1 Modify server.py

Replace the mock hotel search with real API calls:

```python
# At the top of server.py, add:
import httpx
from typing import Dict, List, Any

# Add configuration
BOOKING_API_KEY = os.environ.get('BOOKING_API_KEY')
BOOKING_AFFILIATE_ID = os.environ.get('BOOKING_AFFILIATE_ID')
BOOKING_API_BASE_URL = os.environ.get('BOOKING_API_BASE_URL', 'https://demandapi-sandbox.booking.com/3.1')

# Helper function for Booking.com API calls
async def call_booking_api(endpoint: str, method: str = "GET", payload: Dict = None) -> Any:
    """Make authenticated API calls to Booking.com"""
    headers = {
        "Authorization": f"Bearer {BOOKING_API_KEY}",
        "X-Affiliate-Id": BOOKING_AFFILIATE_ID,
        "Content-Type": "application/json"
    }
    
    url = f"{BOOKING_API_BASE_URL}/{endpoint}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "POST":
            response = await client.post(url, json=payload, headers=headers)
        else:
            response = await client.get(url, headers=headers)
        
        response.raise_for_status()
        return response.json()
```

### 3.2 Update Hotel Search Endpoint

Replace the mock search with real API:

```python
@api_router.post("/hotels/search", response_model=List[HotelInfo])
async def search_hotels(search_request: HotelSearchRequest):
    """Search for hotels using Booking.com API"""
    
    # Convert city name to city_id using Booking.com location API
    # For now, we'll use a mapping of popular cities
    city_mapping = {
        "miami": -1548846,
        "miami beach": -1548846,
        "new york": -2601889,
        "los angeles": -1752729,
        "san diego": -1768774,
        "denver": -1712385,
        "amsterdam": -2140479,
        "london": -2601889,
        "paris": -1456928
    }
    
    city_id = city_mapping.get(search_request.destination.lower())
    
    if not city_id:
        # Fallback to mock data if city not found
        raise HTTPException(
            status_code=400, 
            detail=f"City '{search_request.destination}' not supported yet. Please use: {', '.join(city_mapping.keys())}"
        )
    
    # Prepare Booking.com API payload
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
        # Call Booking.com API
        response_data = await call_booking_api("accommodations/search", "POST", payload)
        
        # Transform response to our HotelInfo model
        hotels = []
        for accommodation in response_data.get("data", [])[:10]:  # Limit to 10 results
            hotel = HotelInfo(
                id=accommodation.get("id"),
                name=accommodation.get("name", ""),
                city=search_request.destination,
                country=accommodation.get("country", ""),
                description=accommodation.get("description", "")[:200] + "...",
                price=float(accommodation.get("price", {}).get("total", 0)),
                currency=accommodation.get("currency", {}).get("accommodation", "USD"),
                rating=accommodation.get("review_score", 0),
                review_count=accommodation.get("review_count", 0),
                image_urls=accommodation.get("image_urls", [])[:4],
                amenities=accommodation.get("facilities", [])[:6]
            )
            hotels.append(hotel)
        
        # Cache results in MongoDB for faster subsequent searches
        cache_doc = {
            "search_params": search_request.dict(),
            "results": [h.dict() for h in hotels],
            "cached_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1)
        }
        await db.hotel_cache.insert_one(cache_doc)
        
        return hotels
        
    except httpx.HTTPError as e:
        logger.error(f"Booking.com API error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Unable to fetch hotels from Booking.com. Please try again later."
        )
```

### 3.3 Update Hotel Details Endpoint

```python
@api_router.get("/hotels/{hotel_id}", response_model=HotelInfo)
async def get_hotel_details(hotel_id: int):
    """Get detailed hotel information from Booking.com"""
    
    # Check cache first
    cached = await db.hotel_cache.find_one(
        {"hotel_id": hotel_id},
        {"_id": 0}
    )
    
    if cached and cached.get("expires_at") > datetime.now(timezone.utc):
        return HotelInfo(**cached["hotel_data"])
    
    try:
        # Call Booking.com API for hotel details
        response_data = await call_booking_api(f"accommodations/{hotel_id}")
        
        accommodation = response_data.get("data", {})
        
        hotel = HotelInfo(
            id=accommodation.get("id"),
            name=accommodation.get("name", ""),
            city=accommodation.get("city", ""),
            country=accommodation.get("country", ""),
            description=accommodation.get("description", ""),
            price=float(accommodation.get("price", {}).get("total", 0)),
            currency=accommodation.get("currency", {}).get("accommodation", "USD"),
            rating=accommodation.get("review_score", 0),
            review_count=accommodation.get("review_count", 0),
            image_urls=accommodation.get("image_urls", []),
            amenities=accommodation.get("facilities", [])
        )
        
        # Cache the hotel details
        cache_doc = {
            "hotel_id": hotel_id,
            "hotel_data": hotel.dict(),
            "cached_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=6)
        }
        await db.hotel_cache.update_one(
            {"hotel_id": hotel_id},
            {"$set": cache_doc},
            upsert=True
        )
        
        return hotel
        
    except httpx.HTTPError as e:
        logger.error(f"Booking.com API error for hotel {hotel_id}: {str(e)}")
        raise HTTPException(
            status_code=404,
            detail="Hotel not found or unavailable"
        )
```

---

## Step 4: Test the Integration

### 4.1 Restart Backend
```bash
cd /app/backend
sudo supervisorctl restart backend
```

### 4.2 Test with curl
```bash
# Get your backend URL
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)

# Test hotel search
curl -X POST "$API_URL/api/hotels/search" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Amsterdam",
    "check_in": "2026-05-01",
    "check_out": "2026-05-05",
    "num_adults": 2,
    "num_rooms": 1
  }'
```

### 4.3 Test in Browser
1. Go to your app: https://wanderbook-27.preview.emergentagent.com
2. Search for "Amsterdam" with dates
3. Verify real hotel results appear
4. Click "View Details" to see full hotel information

---

## Step 5: Handle Common Issues

### 5.1 Rate Limiting
Booking.com limits API calls:
- **Sandbox**: ~50 requests/minute
- **Production**: Depends on your agreement

Implement caching to reduce API calls:
```python
# Already implemented in code above
# Cache search results for 1 hour
# Cache hotel details for 6 hours
```

### 5.2 Error Handling
Monitor backend logs:
```bash
tail -f /var/log/supervisor/backend.err.log
```

Common errors:
- **401 Unauthorized**: Invalid API key or Affiliate ID
- **400 Bad Request**: Invalid search parameters
- **429 Too Many Requests**: Rate limit exceeded
- **404 Not Found**: Hotel ID doesn't exist

### 5.3 City ID Lookup
Booking.com uses city IDs. Add more cities to the mapping:
```python
# You can find city IDs by:
# 1. Using Booking.com's location search API
# 2. Searching on Booking.com website and checking URL
# 3. Common city IDs:

city_mapping = {
    # USA
    "miami": -1548846,
    "new york": -2601889,
    "los angeles": -1752729,
    "san francisco": -1746462,
    "chicago": -1743924,
    "boston": -2073502,
    "seattle": -1771260,
    
    # Europe
    "amsterdam": -2140479,
    "london": -2601889,
    "paris": -1456928,
    "rome": -126693,
    "barcelona": -372490,
    "berlin": -1746443,
    
    # Asia
    "tokyo": -246227,
    "singapore": -73635,
    "bangkok": -3414440,
    "dubai": -782831
}
```

---

## Step 6: Production Deployment

### 6.1 Switch to Production API
Update `/app/backend/.env`:
```bash
BOOKING_API_BASE_URL=https://demandapi.booking.com/3.1
```

### 6.2 Monitor API Usage
Check your Booking.com dashboard for:
- API call statistics
- Error rates
- Booking conversions
- Commission earnings

### 6.3 Optimize Performance
```python
# Add connection pooling
async def create_booking_client():
    """Reuse HTTP client connections"""
    return httpx.AsyncClient(
        timeout=30.0,
        limits=httpx.Limits(
            max_keepalive_connections=20,
            max_connections=100
        )
    )

# Use in your API calls
booking_client = None

@app.on_event("startup")
async def startup():
    global booking_client
    booking_client = await create_booking_client()

@app.on_event("shutdown")
async def shutdown():
    if booking_client:
        await booking_client.aclose()
```

---

## Step 7: Advanced Features

### 7.1 Location Autocomplete
Implement city search:
```python
@api_router.get("/locations/search")
async def search_locations(query: str):
    """Search for cities using Booking.com location API"""
    payload = {
        "query": query,
        "language": "en"
    }
    response = await call_booking_api("locations/search", "POST", payload)
    return response
```

### 7.2 Availability Check
Before booking:
```python
@api_router.post("/hotels/{hotel_id}/availability")
async def check_availability(hotel_id: int, search_params: HotelSearchRequest):
    """Check real-time availability"""
    payload = {
        "accommodation_id": hotel_id,
        "checkin": search_params.check_in,
        "checkout": search_params.check_out,
        "guests": {
            "number_of_adults": search_params.num_adults,
            "number_of_children": search_params.num_children
        }
    }
    response = await call_booking_api("accommodations/availability", "POST", payload)
    return response
```

### 7.3 Real Booking Creation
```python
@api_router.post("/bookings/confirm")
async def confirm_booking_with_booking_com(booking_id: str):
    """Confirm booking with Booking.com after payment"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    payload = {
        "accommodation_id": booking["hotel_id"],
        "checkin_date": booking["check_in"],
        "checkout_date": booking["check_out"],
        "guest": {
            "first_name": booking["guest_first_name"],
            "last_name": booking["guest_last_name"],
            "email": booking["guest_email"]
        },
        "payment_method": "credit_card"
    }
    
    response = await call_booking_api("orders", "POST", payload)
    
    # Update booking with confirmation number
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "booking_com_confirmation": response.get("confirmation_number"),
            "status": "confirmed"
        }}
    )
    
    return response
```

---

## Summary

**Quick Setup Checklist:**
- [ ] Sign up for Booking.com Affiliate Program
- [ ] Generate API Key and get Affiliate ID
- [ ] Add credentials to `/app/backend/.env`
- [ ] Update `server.py` with real API integration code
- [ ] Test in sandbox environment
- [ ] Switch to production when ready
- [ ] Monitor API usage and optimize

**Important Notes:**
- Start with sandbox for testing
- Implement caching to avoid rate limits
- Monitor API usage in Booking.com dashboard
- Never commit credentials to version control

**Support:**
- Booking.com API Docs: https://developers.booking.com/demand/docs
- Affiliate Support: https://www.booking.com/affiliate/support

---

Ready to implement? Just provide your API credentials and I'll update the code!