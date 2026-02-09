import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthStore } from '../store/hotelStore';
import { authService } from '../services/api';
import HeroSection from '../components/HeroSection';

function HomePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getMe();
        setUser(userData);
      } catch (error) {
        // Not authenticated, which is fine for home page
      }
    };

    checkAuth();
  }, [setUser]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      clearUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      <nav className="absolute top-0 left-0 right-0 z-20 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-white">Vibrant Escape</h1>
            
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="text-white hover:bg-white/20"
                    data-testid="dashboard-button"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="text-white hover:bg-white/20"
                    data-testid="logout-button"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => navigate('/login')}
                  variant="secondary"
                  className="rounded-full"
                  data-testid="login-button"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />

      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Why Choose <span className="font-black">Vibrant Escape</span>
            </h2>
            <p className="text-xl text-muted-foreground">Your perfect stay is just a few clicks away</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🏨</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Best Hotels</h3>
              <p className="text-muted-foreground">Curated selection of top-rated properties worldwide</p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Best Prices</h3>
              <p className="text-muted-foreground">Guaranteed lowest prices on all bookings</p>
            </div>

            <div className="text-center p-8">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-2xl font-semibold mb-2">Secure Booking</h3>
              <p className="text-muted-foreground">Safe and secure payment processing</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;