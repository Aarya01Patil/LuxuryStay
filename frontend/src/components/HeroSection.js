import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useHotelStore } from '../store/hotelStore';
import { hotelService } from '../services/api';
import { toast } from 'sonner';

const POPULAR_DESTINATIONS = [
  'Mumbai', 'Goa', 'Delhi', 'Chennai', 'Manali', 'Bangalore', 'Hyderabad',
  'Kolkata', 'Pune', 'Jaipur', 'Udaipur', 'Kerala', 'Shimla', 'Darjeeling',
  'New York', 'London', 'Paris', 'Tokyo', 'Dubai', 'Singapore', 'Bangkok'
];

function HeroSection() {
  const navigate = useNavigate();
  const { searchParams, setSearchParams, setHotels, setLoading, setError } = useHotelStore();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const destinationRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        destinationRef.current &&
        !destinationRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDestinationChange = (e) => {
    const value = e.target.value;
    setSearchParams({ destination: value });

    if (value.length > 0) {
      const filtered = POPULAR_DESTINATIONS.filter(dest =>
        dest.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (destination) => {
    setSearchParams({ destination });
    setShowSuggestions(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchParams.destination || !searchParams.checkIn || !searchParams.checkOut) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate dates
    const checkInDate = new Date(searchParams.checkIn);
    const checkOutDate = new Date(searchParams.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      toast.error("Check-in date cannot be in the past");
      return;
    }

    if (checkOutDate <= checkInDate) {
      toast.error("Check-out date must be after check-in date");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const results = await hotelService.searchHotels({
        destination: searchParams.destination,
        check_in: searchParams.checkIn,
        check_out: searchParams.checkOut,
        num_adults: searchParams.numAdults,
        num_children: searchParams.numChildren,
        num_rooms: searchParams.numRooms
      });
      setHotels(results);
      navigate('/search-results');
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error response:", error.response);
      
      let errorMessage = "Unable to search hotels. ";
      
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
        errorMessage += "Please make sure the backend server is running on http://localhost:5000. Check the browser console for more details.";
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += "Please check your connection and try again.";
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-accent to-secondary/80 animate-gradient"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 40% 20%, rgba(45, 95, 93, 0.2) 0%, transparent 50%)
          `,
          animation: 'float 20s ease-in-out infinite'
        }}></div>
        <img
          src="https://images.unsplash.com/photo-1724598571320-7d2b5584cff6?w=1920"
          alt="Background"
          className="w-full h-full object-cover opacity-20"
          style={{
            animation: 'slowZoom 30s ease-in-out infinite alternate'
          }}
        />
      </div>

      <div className="container relative z-10 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-light text-white mb-6 tracking-tight">
            Discover Your Perfect
            <span className="block font-black mt-2">Escape</span>
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Book amazing hotels worldwide with the best prices guaranteed
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <form onSubmit={handleSearch} data-testid="search-form">
            <div className="bg-white/98 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-primary/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2 relative" ref={destinationRef}>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    <MapPin className="inline w-4 h-4 mr-2" />
                    Destination
                  </label>
                  <Input
                    type="text"
                    placeholder="Where are you going?"
                    value={searchParams.destination}
                    onChange={handleDestinationChange}
                    onFocus={() => {
                      if (searchParams.destination.length > 0) {
                        const filtered = POPULAR_DESTINATIONS.filter(dest =>
                          dest.toLowerCase().includes(searchParams.destination.toLowerCase())
                        );
                        setFilteredSuggestions(filtered);
                        setShowSuggestions(filtered.length > 0);
                      } else {
                        setFilteredSuggestions(POPULAR_DESTINATIONS);
                        setShowSuggestions(true);
                      }
                    }}
                    className="h-14 rounded-xl border-2 hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                    data-testid="destination-input"
                  />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-border max-h-60 overflow-y-auto"
                    >
                      {filteredSuggestions.map((destination, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(destination)}
                          className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors flex items-center gap-2"
                        >
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{destination}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Check-in
                  </label>
                  <Input
                    type="date"
                    value={searchParams.checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newCheckIn = e.target.value;
                      // If checkout is before or equal to new check-in, update it
                      if (searchParams.checkOut && new Date(searchParams.checkOut) <= new Date(newCheckIn)) {
                        const nextDay = new Date(newCheckIn);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setSearchParams({ 
                          checkIn: newCheckIn,
                          checkOut: nextDay.toISOString().split('T')[0]
                        });
                      } else {
                        setSearchParams({ checkIn: newCheckIn });
                      }
                    }}
                    className="h-14 rounded-xl border-2 hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                    data-testid="checkin-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Check-out
                  </label>
                  <Input
                    type="date"
                    value={searchParams.checkOut}
                    min={searchParams.checkIn ? (() => {
                      const minDate = new Date(searchParams.checkIn);
                      minDate.setDate(minDate.getDate() + 1);
                      return minDate.toISOString().split('T')[0];
                    })() : new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const newCheckOut = e.target.value;
                      if (searchParams.checkIn && new Date(newCheckOut) <= new Date(searchParams.checkIn)) {
                        toast.error("Check-out date must be after check-in date");
                        return;
                      }
                      setSearchParams({ checkOut: newCheckOut });
                    }}
                    className="h-14 rounded-xl border-2 hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                    data-testid="checkout-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    <Users className="inline w-4 h-4 mr-2" />
                    Guests
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={searchParams.numAdults}
                    onChange={(e) => setSearchParams({ numAdults: parseInt(e.target.value) })}
                    className="h-14 rounded-xl border-2 hover:border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                    data-testid="guests-input"
                  />
                </div>

                <div className="lg:col-span-3">
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 rounded-full px-8 font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 bg-primary hover:bg-primary/90"
                    data-testid="search-button"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Search Hotels
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;