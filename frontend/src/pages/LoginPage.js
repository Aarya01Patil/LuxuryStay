import React from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';

function LoginPage() {
  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" data-testid="login-page">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1758613171601-64ebfbc928ed?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-secondary/60 to-accent/80"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">Vibrant Escape</h1>
            <p className="text-muted-foreground">Book your dream hotel today</p>
          </div>

          <Button
            onClick={handleLogin}
            size="lg"
            className="w-full h-14 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
            data-testid="google-login-button"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Sign in to access your bookings and exclusive deals
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;