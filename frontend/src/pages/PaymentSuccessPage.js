import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { paymentService } from '../services/api';
import { useToast } from '../components/ui/use-toast';

function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [polling, setPolling] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const pollPaymentStatus = async () => {
      if (attempts >= maxAttempts) {
        setPolling(false);
        toast({
          title: "Status Check Timeout",
          description: "Please check your bookings for confirmation",
          variant: "destructive"
        });
        return;
      }

      try {
        const status = await paymentService.getCheckoutStatus(sessionId);
        
        if (status.payment_status === 'paid') {
          setPaymentStatus(status);
          setPolling(false);
          toast({
            title: "Payment Successful!",
            description: "Your booking has been confirmed"
          });
          return;
        } else if (status.status === 'expired') {
          setPaymentStatus(status);
          setPolling(false);
          toast({
            title: "Payment Expired",
            description: "Please try booking again",
            variant: "destructive"
          });
          return;
        }

        attempts++;
        setTimeout(pollPaymentStatus, pollInterval);
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(pollPaymentStatus, pollInterval);
        } else {
          setPolling(false);
        }
      }
    };

    pollPaymentStatus();
  }, [sessionId, navigate, toast]);

  if (polling) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="payment-processing">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-12 pb-12 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
            <p className="text-muted-foreground">Please wait while we confirm your booking...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4" data-testid="payment-success-page">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="text-center">
            <CheckCircle className="w-20 h-20 text-accent mx-auto mb-4" />
            <CardTitle className="text-3xl font-black">Payment Successful!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentStatus && (
            <div className="bg-muted/50 p-6 rounded-2xl">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold">${(paymentStatus.amount_total / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-accent capitalize">{paymentStatus.payment_status}</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-muted-foreground">
            Your booking has been confirmed! Check your email for booking details.
          </p>

          <Button
            onClick={() => navigate('/dashboard')}
            size="lg"
            className="w-full rounded-full font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
            data-testid="view-bookings-button"
          >
            View My Bookings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentSuccessPage;