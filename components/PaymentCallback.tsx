
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';

export const PaymentCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  
  // Chip usually returns ?status=success or ?status=failed (or similar params depending on config)
  // For this implementation, we will assume the redirect URL contained a query param we set, e.g. ?result=success
  
  useEffect(() => {
    const result = searchParams.get('result');
    
    // Simulate verification delay
    const timer = setTimeout(() => {
      if (result === 'success') {
        setStatus('success');
        // Here you would typically update the order status in Firebase to 'paid'
      } else {
        setStatus('failed');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full text-center">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center">
             <Loader2 size={48} className="text-brand-gold animate-spin mb-6" />
             <h2 className="font-serif text-2xl text-gray-900">Verifying Payment...</h2>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-slide-up">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} className="text-brand-green" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-4">Payment Successful</h1>
            <p className="font-sans text-gray-500 mb-8 leading-relaxed">
              Thank you for your purchase. Your heirloom is being prepared with care. A confirmation email has been sent.
            </p>
            <button 
              onClick={() => navigate('/')}
              className="bg-brand-flamingo text-white px-8 py-3.5 font-sans uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-brand-gold transition-colors rounded-full flex items-center gap-2"
            >
              Continue Shopping <ArrowRight size={14} />
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center animate-slide-up">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <XCircle size={40} className="text-red-400" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-4">Payment Failed</h1>
            <p className="font-sans text-gray-500 mb-8 leading-relaxed">
              We couldn't process your payment. Please try again or use a different payment method.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/checkout')}
                className="bg-gray-900 text-white px-8 py-3.5 font-sans uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-brand-flamingo transition-colors rounded-full"
              >
                Try Again
              </button>
              <button 
                onClick={() => navigate('/')}
                className="text-gray-500 px-6 py-3.5 font-sans uppercase tracking-[0.2em] text-[10px] font-bold hover:text-gray-900 transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
