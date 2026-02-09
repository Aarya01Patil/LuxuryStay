import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useHotelStore } from '../store/hotelStore';
import { hotelService } from '../services/api';
import { toast } from 'sonner';

function HeroSection() {
  const navigate = useNavigate();
  const { searchParams, setSearchParams, setHotels, setLoading, setError } = useHotelStore();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!searchParams.destination || !searchParams.checkIn || !searchParams.checkOut) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
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
      setError(error.message);
      toast({
        title: "Search Failed",
        description: "Unable to search hotels. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden" data-testid="hero-section">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1724598571320-7d2b5584cff6?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background"></div>
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
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    <MapPin className="inline w-4 h-4 mr-2" />
                    Destination
                  </label>
                  <Input
                    type="text"
                    placeholder="Where are you going?"
                    value={searchParams.destination}
                    onChange={(e) => setSearchParams({ destination: e.target.value })}
                    className="h-14 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    data-testid="destination-input"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3 text-foreground">
                    <Calendar className="inline w-4 h-4 mr-2" />
                    Check-in
                  </label>
                  <Input
                    type="date"
                    value={searchParams.checkIn}
                    onChange={(e) => setSearchParams({ checkIn: e.target.value })}
                    className="h-14 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
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
                    onChange={(e) => setSearchParams({ checkOut: e.target.value })}
                    className="h-14 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
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
                    className="h-14 rounded-xl border-2 border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10"
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