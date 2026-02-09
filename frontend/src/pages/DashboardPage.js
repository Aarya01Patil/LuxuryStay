import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Calendar, MapPin, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuthStore } from '../store/hotelStore';
import { authService, bookingService } from '../services/api';
import { useToast } from '../components/ui/use-toast';

function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, clearUser } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await bookingService.getUserBookings();
        setBookings(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load bookings",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [toast]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      clearUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-accent text-white';
      case 'pending_payment':
        return 'bg-secondary text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">Vibrant Escape</h1>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                data-testid="home-button"
              >
                Home
              </Button>
              <Button
                variant="ghost"
                onClick={handleLogout}
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 md:px-12 lg:px-24 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {user?.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-16 h-16 rounded-full border-4 border-primary"
              />
            )}
            <div>
              <h2 className="text-3xl font-black">Welcome back, {user?.name?.split(' ')[0]}!</h2>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-6">My Bookings</h3>

          {loading ? (
            <div className="flex justify-center py-12" data-testid="loading-bookings">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : bookings.length === 0 ? (
            <Card data-testid="no-bookings">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">You don't have any bookings yet</p>
                <Button
                  onClick={() => navigate('/')}
                  className="rounded-full"
                  data-testid="start-exploring-button"
                >
                  Start Exploring
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bookings.map((booking) => (
                <Card key={booking.booking_id} className="hover:shadow-lg transition-shadow" data-testid={`booking-card-${booking.booking_id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl font-bold">{booking.hotel_name}</CardTitle>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{booking.check_in} to {booking.check_out}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-semibold">${booking.total_price.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Booking ID: {booking.booking_id}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;