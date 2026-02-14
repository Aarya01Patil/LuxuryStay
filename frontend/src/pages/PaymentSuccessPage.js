import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const booking = location.state?.booking;

  useEffect(() => {
    if (!booking) {
      navigate('/');
    }
  }, [booking, navigate]);

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="payment-success-page">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="text-center">
            <CheckCircle className="w-20 h-20 text-accent mx-auto mb-4" />
            <CardTitle className="text-3xl font-black">Booking Confirmed!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-6 rounded-2xl">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span className="font-bold">{booking.hotel_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-semibold">{booking.check_in}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-semibold">{booking.check_out}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-muted-foreground">Total Price</span>
                <span className="font-bold text-lg">₹{booking.total_price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold text-accent capitalize">{booking.status}</span>
              </div>
            </div>
          </div>

          <p className="text-center text-muted-foreground">
            Your booking has been confirmed! We look forward to hosting you.
          </p>

          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="w-full rounded-full font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95 text-white"
            data-testid="view-bookings-button"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentSuccessPage;