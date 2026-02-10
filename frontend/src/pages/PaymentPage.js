import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { paymentService } from '../services/api';
import { toast } from 'sonner';

function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const booking = location.state?.booking;

  useEffect(() => {
    if (!booking) {
      navigate('/dashboard');
    }
  }, [booking, navigate]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const originUrl = window.location.origin;
      const session = await paymentService.createCheckoutSession(booking.booking_id, originUrl);
      
      window.location.href = session.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Unable to process payment");
      setLoading(false);
    }
  };

  if (!booking) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="payment-page">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="text-3xl font-black text-center">Complete Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-6 rounded-2xl">
            <h3 className="font-semibold text-lg mb-4">Booking Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span className="font-semibold">{booking.hotel_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-semibold">{booking.check_in}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-out</span>
                <span className="font-semibold">{booking.check_out}</span>
              </div>
              <div className="pt-4 border-t border-border flex justify-between text-lg">
                <span className="font-bold">Total Amount</span>
                <span className="font-black text-primary">₹{booking.total_price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            size="lg"
            className="w-full rounded-full font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
            disabled={loading}
            data-testid="proceed-payment-button"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {loading ? 'Redirecting...' : 'Proceed to Payment'}
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-full"
            data-testid="cancel-payment-button"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentPage;