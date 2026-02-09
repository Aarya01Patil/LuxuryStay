import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useHotelStore } from '../store/hotelStore';

function HotelResults() {
  const navigate = useNavigate();
  const { hotels, isLoading, error, setSelectedHotel } = useHotelStore();

  const handleSelectHotel = (hotel) => {
    setSelectedHotel(hotel);
    navigate(`/hotel/${hotel.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12" data-testid="loading-indicator">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Searching for hotels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50" data-testid="error-message">
        <CardContent className="pt-6">
          <p className="text-red-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (hotels.length === 0) {
    return (
      <Card data-testid="no-results">
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No hotels found. Try adjusting your search criteria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="hotel-results">
      {hotels.map((hotel) => (
        <Card 
          key={hotel.id} 
          className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
          data-testid={`hotel-card-${hotel.id}`}
        >
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
              {hotel.image_urls && hotel.image_urls.length > 0 && (
                <div className="md:col-span-1 relative h-64 md:h-auto">
                  <img
                    src={hotel.image_urls[0]}
                    alt={hotel.name}
                    className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                  />
                </div>
              )}
              
              <div className="md:col-span-2 p-6">
                <h3 className="text-2xl font-semibold mb-2">{hotel.name}</h3>
                
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{hotel.city}, {hotel.country}</p>
                </div>
                
                {hotel.rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(hotel.rating / 2)
                              ? 'fill-secondary text-secondary'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">{hotel.rating}</span>
                    {hotel.review_count && (
                      <span className="text-sm text-muted-foreground">({hotel.review_count} reviews)</span>
                    )}
                  </div>
                )}

                <p className="text-muted-foreground mb-4">{hotel.description}</p>
                
                {hotel.amenities && hotel.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="md:col-span-1 flex flex-col justify-between p-6 bg-muted/30">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Price per night</p>
                  <p className="text-4xl font-black text-primary mb-1">
                    ${hotel.price.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">+ taxes & fees</p>
                </div>
                
                <Button
                  onClick={() => handleSelectHotel(hotel)}
                  className="w-full rounded-full font-semibold shadow-md hover:shadow-lg transition-all active:scale-95"
                  size="lg"
                  data-testid={`view-details-button-${hotel.id}`}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default HotelResults;