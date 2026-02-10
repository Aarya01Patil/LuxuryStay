import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useHotelStore, useAuthStore } from '../store/hotelStore';
import { hotelService, bookingService, authService } from '../services/api';
import { toast } from 'sonner';

function HotelDetailsPage() {
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const { selectedHotel, setSelectedHotel, searchParams } = useHotelStore();
  const { isAuthenticated, setUser } = useAuthStore();
  const [hotel, setHotel] = useState(selectedHotel);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [bookingData, setBookingData] = useState({
    guestFirstName: '',
    guestLastName: '',
    guestEmail: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getMe();
        setUser(userData);
      } catch (error) {
        // Not authenticated
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [setUser]);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!selectedHotel || selectedHotel.id !== parseInt(hotelId)) {
        try {
          const hotelData = await hotelService.getHotelDetails(parseInt(hotelId));
          setHotel(hotelData);
          setSelectedHotel(hotelData);
        } catch (error) {
          toast.error("Failed to load hotel details");
        }
      }
    };
    fetchHotel();
  }, [hotelId, selectedHotel, setSelectedHotel]);

  const calculateNights = () => {
    if (!searchParams.checkIn || !searchParams.checkOut) return 0;
    const checkIn = new Date(searchParams.checkIn);
    const checkOut = new Date(searchParams.checkOut);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const calculateTotal = () => {
    if (!hotel) return 0;
    const nights = calculateNights();
    return hotel.price * nights;
  };

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!bookingData.guestFirstName || !bookingData.guestLastName || !bookingData.guestEmail) {
      toast.error("Please fill in all guest details");
      return;
    }

    if (!searchParams.checkIn || !searchParams.checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    try {
      setLoading(true);
      const booking = await bookingService.createBooking({
        hotel_id: hotel.id,
        check_in: searchParams.checkIn,
        check_out: searchParams.checkOut,
        guest_first_name: bookingData.guestFirstName,
        guest_last_name: bookingData.guestLastName,
        guest_email: bookingData.guestEmail,
        num_adults: searchParams.numAdults || 1,
        num_children: searchParams.numChildren || 0,
        total_price: calculateTotal()
      });

      toast.success("Booking created! Proceeding to payment...");
      navigate('/payment', { state: { booking } });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to create booking");
    } finally {
      setLoading(false);
    }
  };

  if (!hotel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const nights = calculateNights();
  const totalPrice = calculateTotal();

  return (
    <div className="min-h-screen bg-background" data-testid="hotel-details-page">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">Vibrant Escape</h1>
            <Button
              variant="ghost"
              onClick={() => navigate('/search-results')}
              data-testid="back-to-results-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Results
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 md:px-12 lg:px-24 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 mb-8">
              {hotel.image_urls.map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt={`${hotel.name} ${index + 1}`}
                  className="w-full h-64 object-cover rounded-2xl shadow-md"
                />
              ))}
            </div>

            <div className="mb-8">
              <h2 className="text-4xl font-black mb-2">{hotel.name}</h2>
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">{hotel.city}, {hotel.country}</p>
              </div>

              {hotel.rating && (
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(hotel.rating / 2)
                            ? 'fill-secondary text-secondary'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-lg font-semibold">{hotel.rating}</span>
                  {hotel.review_count && (
                    <span className="text-muted-foreground">({hotel.review_count} reviews)</span>
                  )}
                </div>
              )}

              <p className="text-lg text-muted-foreground mb-6">{hotel.description}</p>

              <div className="mb-6">
                <h3 className="text-2xl font-semibold mb-4">Amenities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {hotel.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-accent" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle className="text-3xl font-black">
                  ₹{hotel.price}
                  <span className="text-base font-normal text-muted-foreground"> / night</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Check-in / Check-out</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={searchParams.checkIn}
                        readOnly
                        className="bg-muted"
                      />
                      <Input
                        type="date"
                        value={searchParams.checkOut}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">First Name *</label>
                    <Input
                      type="text"
                      value={bookingData.guestFirstName}
                      onChange={(e) => setBookingData({ ...bookingData, guestFirstName: e.target.value })}
                      placeholder="John"
                      required
                      data-testid="first-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Last Name *</label>
                    <Input
                      type="text"
                      value={bookingData.guestLastName}
                      onChange={(e) => setBookingData({ ...bookingData, guestLastName: e.target.value })}
                      placeholder="Doe"
                      required
                      data-testid="last-name-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Email *</label>
                    <Input
                      type="email"
                      value={bookingData.guestEmail}
                      onChange={(e) => setBookingData({ ...bookingData, guestEmail: e.target.value })}
                      placeholder="john@example.com"
                      required
                      data-testid="email-input"
                    />
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">${hotel.price} x {nights} nights</span>
                      <span className="font-semibold">${(hotel.price * nights).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-full font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
                    disabled={loading}
                    data-testid="reserve-button"
                  >
                    {loading ? 'Processing...' : 'Reserve & Pay'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HotelDetailsPage;