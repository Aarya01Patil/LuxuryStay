import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import HotelResults from '../components/HotelResults';

function SearchResultsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" data-testid="search-results-page">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Luxury Stay</h1>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Search
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 md:px-12 lg:px-24 py-12">
        <div className="mb-8">
          <h2 className="text-4xl font-light mb-2">
            Available <span className="font-black">Hotels</span>
          </h2>
          <p className="text-muted-foreground">Select your perfect accommodation</p>
        </div>

        <HotelResults />
      </div>
    </div>
  );
}

export default SearchResultsPage;