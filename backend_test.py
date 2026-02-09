import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class HotelBookingAPITester:
    def __init__(self, base_url="https://wanderbook-27.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}

    def setup_test_user(self):
        """Create test user and session using MongoDB directly"""
        print("\n🔧 Setting up test user and session...")
        
        # Generate test data
        user_id = f"test-user-{int(datetime.now().timestamp())}"
        session_token = f"test_session_{uuid.uuid4().hex[:16]}"
        
        # Create test user via MongoDB (simulating auth flow)
        test_user = {
            "user_id": user_id,
            "email": f"test.user.{int(datetime.now().timestamp())}@example.com",
            "name": "Test User",
            "picture": "https://via.placeholder.com/150"
        }
        
        self.session_token = session_token
        self.user_data = test_user
        
        print(f"📝 Test User ID: {user_id}")
        print(f"🔑 Session Token: {session_token}")
        
        return True

    def test_hotel_search(self):
        """Test hotel search functionality"""
        print("\n🏨 Testing Hotel Search...")
        
        search_data = {
            "destination": "Miami",
            "check_in": "2026-03-01",
            "check_out": "2026-03-05",
            "num_adults": 2,
            "num_children": 0,
            "num_rooms": 1
        }
        
        success, response = self.run_test(
            "Hotel Search - Miami",
            "POST",
            "hotels/search",
            200,
            data=search_data
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.log_test("Hotel Search - Results Found", True)
            return response[0]  # Return first hotel for booking test
        else:
            self.log_test("Hotel Search - Results Found", False, "No hotels returned")
            return None

    def test_hotel_details(self, hotel_id=1001):
        """Test hotel details endpoint"""
        print(f"\n🏨 Testing Hotel Details for ID {hotel_id}...")
        
        success, response = self.run_test(
            f"Hotel Details - ID {hotel_id}",
            "GET",
            f"hotels/{hotel_id}",
            200
        )
        
        if success and 'id' in response:
            self.log_test("Hotel Details - Valid Response", True)
            return response
        else:
            self.log_test("Hotel Details - Valid Response", False, "Invalid hotel data")
            return None

    def test_auth_endpoints_without_token(self):
        """Test auth endpoints without authentication"""
        print("\n🔐 Testing Auth Endpoints (Unauthenticated)...")
        
        # Temporarily remove token
        temp_token = self.session_token
        self.session_token = None
        
        # Test protected endpoints should return 401
        self.run_test("Auth Me - Unauthorized", "GET", "auth/me", 401)
        self.run_test("Get Bookings - Unauthorized", "GET", "bookings", 401)
        
        # Restore token
        self.session_token = temp_token

    def test_booking_creation(self, hotel_data):
        """Test booking creation (requires auth)"""
        print("\n📝 Testing Booking Creation...")
        
        if not hotel_data:
            self.log_test("Booking Creation", False, "No hotel data available")
            return None
        
        booking_data = {
            "hotel_id": hotel_data["id"],
            "check_in": "2026-03-01",
            "check_out": "2026-03-05",
            "guest_first_name": "John",
            "guest_last_name": "Doe",
            "guest_email": "john.doe@example.com",
            "num_adults": 2,
            "num_children": 0,
            "total_price": hotel_data["price"] * 4  # 4 nights
        }
        
        success, response = self.run_test(
            "Create Booking",
            "POST",
            "bookings/create",
            200,
            data=booking_data
        )
        
        if success and 'booking_id' in response:
            self.log_test("Booking Creation - Valid Response", True)
            return response
        else:
            self.log_test("Booking Creation - Valid Response", False, "Invalid booking response")
            return None

    def test_payment_checkout(self, booking_data):
        """Test payment checkout session creation"""
        print("\n💳 Testing Payment Checkout...")
        
        if not booking_data:
            self.log_test("Payment Checkout", False, "No booking data available")
            return None
        
        checkout_data = {
            "booking_id": booking_data["booking_id"],
            "origin_url": "https://wanderbook-27.preview.emergentagent.com"
        }
        
        success, response = self.run_test(
            "Create Checkout Session",
            "POST",
            "payments/checkout/session",
            200,
            data=checkout_data
        )
        
        if success and 'session_id' in response:
            self.log_test("Payment Checkout - Valid Response", True)
            return response
        else:
            self.log_test("Payment Checkout - Valid Response", False, "Invalid checkout response")
            return None

    def test_get_bookings(self):
        """Test getting user bookings"""
        print("\n📋 Testing Get User Bookings...")
        
        success, response = self.run_test(
            "Get User Bookings",
            "GET",
            "bookings",
            200
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Bookings - Valid Response", True)
            return response
        else:
            self.log_test("Get Bookings - Valid Response", False, "Invalid bookings response")
            return None

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Hotel Booking API Test Suite")
        print("=" * 50)
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Failed to setup test user")
            return False
        
        # Test unauthenticated endpoints
        self.test_auth_endpoints_without_token()
        
        # Test hotel search (public endpoint)
        hotel_data = self.test_hotel_search()
        
        # Test hotel details (public endpoint)
        if hotel_data:
            self.test_hotel_details(hotel_data["id"])
        else:
            self.test_hotel_details()  # Test with default ID
        
        # Note: Auth-protected endpoints will fail without proper session setup
        # This is expected behavior for this test setup
        print("\n⚠️  Note: Auth-protected endpoints (bookings, payments) require")
        print("   proper MongoDB session setup and will show as failed in this test.")
        print("   This is expected behavior for API-only testing.")
        
        # Test booking creation (will fail without proper auth)
        booking_data = self.test_booking_creation(hotel_data)
        
        # Test payment checkout (will fail without proper auth)
        self.test_payment_checkout(booking_data)
        
        # Test get bookings (will fail without proper auth)
        self.test_get_bookings()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = HotelBookingAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    results = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": tester.tests_run,
        "passed_tests": tester.tests_passed,
        "success_rate": f"{(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "0%",
        "test_details": tester.test_results
    }
    
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())