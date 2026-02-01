
import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { Lock, CheckCircle, ArrowLeft, Loader2, CreditCard } from 'lucide-react';
import { createOrderInDb } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface CheckoutViewProps {
  cart: CartItem[];
  onOrderSuccess: () => void;
}

const API_URL = 'https://gate.chip-in.asia/api/v1/purchases/';

export const CheckoutView: React.FC<CheckoutViewProps> = ({ cart, onOrderSuccess }) => {
  const navigate = useNavigate();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Shipping Logic: RM 10 for more than 2 items (3+), otherwise RM 8
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const shipping = totalItems > 2 ? 10 : 8;
  
  const total = subtotal + shipping;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');

  // Debugging: Check if keys are loaded (only runs once on mount)
  useEffect(() => {
    const env = (import.meta as any).env;
    const hasBrandId = !!env.CHIP_ID;
    const hasApiKey = !!env.CHIP_API;
    console.log(`[Payment Config] Brand ID Loaded: ${hasBrandId}, API Key Loaded: ${hasApiKey}`);
    
    if (!hasBrandId || !hasApiKey) {
      console.warn("[Payment Config] Missing keys. Ensure CHIP_ID and CHIP_API are set in Vercel.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    // Retrieve keys from Environment Variables
    const brandId = (import.meta as any).env.CHIP_ID;
    const apiKey = (import.meta as any).env.CHIP_API;

    if (!brandId || !apiKey) {
      setError("Payment configuration missing. Please ensure CHIP_ID and CHIP_API are set in your Vercel environment variables.");
      setIsProcessing(false);
      return;
    }
    
    try {
      // 1. Create Order in Database first (status pending)
      const orderRef = await createOrderInDb({
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        items: cart,
        total: total,
        status: 'pending',
        date: new Date().toISOString(),
        shippingAddress: `${address}, ${postcode} ${city}, Malaysia`
      });

      // 2. Prepare Chip Payload
      const payload = {
        brand_id: brandId,
        client: {
          email: email,
          phone: "0123456789", // Ideally collect phone number in form
          full_name: `${firstName} ${lastName}`.substring(0, 30) // Chip limit
        },
        purchase: {
          currency: 'MYR',
          products: cart.map(item => ({
            name: item.name.substring(0, 256),
            quantity: item.quantity,
            price: Math.round(item.price * 100) // Chip expects cents
          })),
          ...(shipping > 0 ? {
             products: [
               ...cart.map(item => ({
                 name: item.name.substring(0, 256),
                 quantity: item.quantity,
                 price: Math.round(item.price * 100)
               })),
               {
                 name: "Shipping",
                 quantity: 1,
                 price: Math.round(shipping * 100)
               }
             ]
          } : {})
        },
        reference: orderRef.id,
        success_redirect: `${window.location.origin}/#/payment/callback?result=success&order=${orderRef.id}`,
        failure_redirect: `${window.location.origin}/#/payment/callback?result=failed&order=${orderRef.id}`,
        cancel_redirect: `${window.location.origin}/#/checkout`,
      };

      // 3. Call Chip API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        // Detailed error logging
        console.error("Chip API Error Response:", data);
        throw new Error(data.message || (data.errors ? JSON.stringify(data.errors) : "Payment initialization failed"));
      }

      onOrderSuccess(); 

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned from payment provider");
      }

    } catch (err: any) {
      console.error("Payment Error:", err);
      setError(err.message || "Failed to initiate payment. Check API Keys and console.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white animate-fade-in flex flex-col lg:flex-row">
      
      {/* Left Column: Form */}
      <div className="w-full lg:w-[58%] px-6 lg:px-24 pt-12 lg:pt-24 pb-12 border-r border-brand-latte/10">
        <div className="max-w-xl mx-auto lg:mx-0">
          
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-400 hover:text-brand-flamingo mb-10 transition-colors text-xs font-bold uppercase tracking-widest">
            <ArrowLeft size={14} /> Back to Bag
          </button>

          <div className="mb-12">
            <h1 className="font-serif text-3xl text-gray-900 mb-2">Checkout</h1>
            <p className="font-sans text-gray-400 text-sm">Please enter your details below.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            
            {/* Contact */}
            <section>
              <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Contact Information</h2>
              <input 
                type="email" 
                placeholder="Email Address" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors"
              />
            </section>

            {/* Shipping */}
            <section>
              <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Shipping Address</h2>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <input 
                  type="text" placeholder="First Name" required 
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors" 
                />
                <input 
                  type="text" placeholder="Last Name" required 
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors" 
                />
              </div>
              <div className="flex flex-col gap-6">
                <input 
                  type="text" placeholder="Address" required 
                  value={address} onChange={e => setAddress(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors" 
                />
                <input type="text" placeholder="Apartment, suite, etc. (optional)" className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors" />
                <div className="grid grid-cols-2 gap-6">
                   <input 
                    type="text" placeholder="Postcode" required 
                    value={postcode} onChange={e => setPostcode(e.target.value)}
                    className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors" 
                   />
                   <input 
                    type="text" placeholder="City" required 
                    value={city} onChange={e => setCity(e.target.value)}
                    className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors" 
                   />
                </div>
                <input type="text" placeholder="Country" defaultValue="Malaysia" disabled className="w-full py-3 bg-transparent border-b border-brand-latte/40 text-gray-400 cursor-not-allowed font-sans" />
              </div>
            </section>

            {/* Payment Info */}
            <section>
              <h2 className="font-sans text-xs font-bold uppercase tracking-widest text-gray-900 mb-6">Payment Method</h2>
              <div className="bg-brand-grey/5 p-6 rounded-[2px] border border-brand-latte/10">
                <div className="flex flex-col gap-4 items-center justify-center py-4 text-center">
                  <Lock size={24} className="text-brand-latte mb-2" />
                  <p className="text-sm text-gray-500 font-light">
                    You will be redirected to <span className="font-bold text-gray-900">Chip</span> to securely complete your payment.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest mt-2">
                    <CreditCard size={12} /> Secure Gateway
                  </div>
                </div>
              </div>
            </section>
            
            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded border border-red-100">{error}</p>
            )}

            <button 
                type="submit"
                disabled={isProcessing}
                className="mt-4 w-full bg-brand-flamingo text-white h-14 rounded-full flex items-center justify-center gap-3 hover:bg-brand-gold transition-colors font-sans text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg shadow-brand-flamingo/20 disabled:opacity-70 disabled:cursor-wait"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Redirecting to Chip...
                  </>
                ) : (
                  `Pay RM ${total}`
                )}
            </button>
            
          </form>
        </div>
      </div>

      {/* Right Column: Summary */}
      <div className="w-full lg:w-[42%] bg-brand-grey/5 px-6 lg:px-16 pt-12 lg:pt-24 pb-12 lg:min-h-screen border-l border-brand-latte/10">
        <div className="max-w-md mx-auto lg:mx-0 sticky top-24">
          <h2 className="font-serif text-2xl text-gray-900 mb-8">In Your Bag</h2>
          
          <div className="space-y-6 mb-10">
            {cart.map(item => (
              <div key={item.id} className="flex gap-4 items-start">
                 <div className="w-16 h-20 bg-white border border-brand-latte/20 relative rounded-[2px] overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover" />
                    <span className="absolute -top-0 -right-0 w-5 h-5 bg-brand-latte/90 text-white text-[10px] font-bold flex items-center justify-center rounded-bl-lg">
                      {item.quantity}
                    </span>
                 </div>
                 <div className="flex-1">
                   <h4 className="font-serif text-gray-900">{item.name}</h4>
                   <p className="text-xs text-gray-500 font-sans mt-1">RM {item.price}</p>
                 </div>
                 <div className="font-sans text-sm font-bold text-gray-900">
                   RM {item.price * item.quantity}
                 </div>
              </div>
            ))}
          </div>

          <div className="border-t border-brand-latte/20 pt-6 space-y-3">
             <div className="flex justify-between text-sm font-sans text-gray-600">
                <span>Subtotal</span>
                <span>RM {subtotal}</span>
             </div>
             <div className="flex justify-between text-sm font-sans text-gray-600">
                <span>Shipping</span>
                <span>RM {shipping}</span>
             </div>
          </div>
          
          <div className="border-t border-brand-latte/20 pt-6 mt-6">
             <div className="flex justify-between items-end">
                <span className="font-serif text-xl text-gray-900">Total</span>
                <span className="font-serif text-3xl text-gray-900">RM {total}</span>
             </div>
          </div>

          <div className="mt-12 flex items-center gap-3 justify-center text-brand-gold opacity-60">
             <CheckCircle size={14} />
             <span className="text-[10px] uppercase tracking-widest font-bold">Money Back Guarantee</span>
          </div>

        </div>
      </div>

    </div>
  );
};
