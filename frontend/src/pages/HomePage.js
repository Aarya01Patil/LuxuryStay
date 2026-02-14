import React from 'react';
import HeroSection from '../components/HeroSection';

function HomePage() {

  return (
    <div className="min-h-screen" data-testid="home-page">
      <nav className="absolute top-0 left-0 right-0 z-20 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Luxury Stay</h1>
          </div>
        </div>
      </nav>

      <HeroSection />

      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-light mb-4">
              Why Choose <span className="font-bold">Luxury Stay</span>
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