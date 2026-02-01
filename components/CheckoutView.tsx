
import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { Lock, CheckCircle, ArrowLeft, Loader2, CreditCard, AlertTriangle, Phone } from 'lucide-react';
import { createOrderInDb } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface CheckoutViewProps {
  cart: CartItem[];
  onOrderSuccess: () => void;
}

// We use the local proxy path now (configured in vite.config.ts and vercel.json)
// This avoids CORS errors by letting the server handle the cross-origin request
const API_URL = '/api/chip/purchases/';

export const CheckoutView: React.FC<CheckoutViewProps> = ({ cart, onOrderSuccess }) => {
  const navigate = useNavigate();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Shipping State
  const [region, setRegion] = useState<'west' | 'east'>('west');

  // Shipping Logic
  // West Malaysia: RM 8 flat, or RM 10 if 3+ items
  // East Malaysia: RM 12 flat
  const calculateShipping = () => {
    if (region === 'east') {
      return 12;
    } else {
      return totalItems >= 3 ? 10 : 8;
    }
  };

  const shipping = calculateShipping();
  const total = subtotal + shipping;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [city, setCity] = useState('');

  // Access Environment Variables Directly
  // Note: We access them directly on import.meta.env so Vite can statically replace them at build time.
  const getPaymentConfig = () => {
    const env = (import.meta as any).env;
    return {
      // Try VITE_ prefix first (Standard), then CHIP_ prefix
      brandId: env.VITE_CHIP_ID || env.CHIP_ID,
      apiKey: env.VITE_CHIP_API || env.CHIP_API
    };
  };

  // Debugging: Check if keys are loaded
  useEffect(() => {
    const { brandId, apiKey } = getPaymentConfig();
    const isConfigured = !!brandId && !!apiKey;
    
    console.log(`[Payment Config] Loaded: ${isConfigured}`);
    
    if (!isConfigured) {
      console.warn("[Payment Config] Missing keys. Ensure VITE_CHIP_ID and VITE_CHIP_API are set in Vercel and you have REDEPLOYED.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError('');

    const { brandId, apiKey } = getPaymentConfig();

    if (!brandId || !apiKey) {
      setError("Configuration Error: Payment Gateway ID or API Key is missing.");
      setIsProcessing(false);
      return;
    }
    
    try {
      // 1. Create Order in Database first (status pending)
      const orderRef = await createOrderInDb({
        customerName: `${firstName} ${lastName}`,
        customerEmail: email,
        customerPhone: phone,
        items: cart,
        total: total,
        status: 'pending',
        date: new Date().toISOString(),
        shippingAddress: `${address}, ${postcode} ${city}, ${region === 'east' ? 'East Malaysia' : 'West Malaysia'}`
      });

      // 2. Prepare Chip Payload
      // Note: Amounts must be in cents (integer)
      const payload = {
        brand_id: brandId,
        client: {
          email: email,
          phone: phone, 
          full_name: `${firstName} ${lastName}`.substring(0, 30) // Chip limit
        },
        purchase: {
          currency: 'MYR',
          products: [
            ...cart.map(item => ({
              name: item.name.substring(0, 256),
              quantity: item.quantity,
              price: Math.round(item.price * 100) // Chip expects cents
            })),
            {
              name: "Shipping Fee",
              quantity: 1,
              price: Math.round(shipping * 100)
            }
          ]
        },
        reference: orderRef.id,
        // We pass the order ID in the redirect URL so we can update it later
        success_redirect: `${window.location.origin}/#/payment/callback?result=success&order=${orderRef.id}`,
        failure_redirect: `${window.location.origin}/#/payment/callback?result=failed&order=${orderRef.id}`,
        // Redirect cancel to callback too, so we can mark it as 'cancelled' in DB
        cancel_redirect: `${window.location.origin}/#/payment/callback?result=cancelled&order=${orderRef.id}`,
      };

      // 3. Call Chip API via Proxy
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Invalid response from payment provider: ${response.statusText}`);
      }

      if (!response.ok) {
        console.error("Chip API Error Response:", data);
        const msg = data.message || (data.errors ? Object.values(data.errors).join(', ') : "Payment initialization failed");
        throw new Error(msg);
      }

      onOrderSuccess(); 

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("No checkout URL returned from payment provider");
      }

    } catch (err: any) {
      console.error("Payment Error:", err);
      setError(err.message || "Failed to initiate payment. Please try again.");
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
              <div className="flex flex-col gap-6">
                <input 
                  type="email" 
                  placeholder="Email Address" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors"
                />
                <input 
                  type="tel" 
                  placeholder="Phone Number (e.g. +60123456789)" 
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 placeholder:text-gray-300 transition-colors"
                />
              </div>
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
                
                {/* Region Selection for Shipping Calc */}
                <div className="relative">
                  <select 
                    value={region}
                    onChange={(e) => setRegion(e.target.value as 'west' | 'east')}
                    className="w-full py-3 bg-transparent border-b border-brand-latte/40 focus:border-brand-flamingo outline-none font-sans text-gray-800 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="west">West Malaysia (Peninsular)</option>
                    <option value="east">East Malaysia (Sabah & Sarawak)</option>
                  </select>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                       <path d="M5 6L0 0H10L5 6Z" />
                    </svg>
                  </div>
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
                    You will be redirected to <span className="font-bold text-gray-900">CHIP</span> to securely complete your payment.
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest mt-2">
                    <CreditCard size={12} /> Secure Gateway
                  </div>
                </div>
              </div>
            </section>
            
            {error && (
              <div className="bg-red-50 p-4 rounded border border-red-100 flex items-start gap-3">
                <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1">
                  <p className="text-red-600 text-sm font-bold mb-1">Payment Initialization Failed</p>
                  <p className="text-red-500 text-xs">{error}</p>
                  {(error.includes("Configuration") || error.includes("missing")) && (
                     <p className="text-red-500 text-[10px] mt-2 italic">
                       Developer Note: Ensure VITE_CHIP_ID and VITE_CHIP_API are set in Vercel and the app has been redeployed.
                     </p>
                  )}
                </div>
              </div>
            )}

            <button 
                type="submit"
                disabled={isProcessing}
                className="mt-4 w-full bg-brand-flamingo text-white h-14 rounded-full flex items-center justify-center gap-3 hover:bg-brand-gold transition-colors font-sans text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg shadow-brand-flamingo/20 disabled:opacity-70 disabled:cursor-wait"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Redirecting to CHIP...
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
             <div className="text-[10px] text-gray-400 italic text-right">
               {region === 'west' 
                 ? (totalItems >= 3 ? '(West Malaysia Bulk Rate)' : '(West Malaysia Standard Rate)') 
                 : '(East Malaysia Rate)'}
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
             <span className="text-[10px] uppercase tracking-widest font-bold">Secure Payment Processing</span>
          </div>

        </div>
      </div>

    </div>
  );
};
