
import React from 'react';
import { CartItem } from '../types';
import { Minus, Plus, Trash2, ArrowRight, ArrowLeft, Gift, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartViewProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
}

export const CartView: React.FC<CartViewProps> = ({ 
  cart, 
  onUpdateQuantity, 
  onRemoveItem 
}) => {
  const navigate = useNavigate();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Packaging Logic: 1 set for every 1 item
  const packagingCount = totalItems;

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-white animate-fade-in px-6">
        <h2 className="font-serif text-3xl md:text-4xl text-gray-900 mb-4">Your bag is empty</h2>
        <p className="font-sans text-gray-500 mb-8 font-light">Discover our collection of signature pieces.</p>
        <button 
          onClick={() => navigate('/')}
          className="bg-brand-flamingo text-white px-8 py-3.5 font-sans uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-brand-gold transition-colors rounded-full"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white animate-fade-in pt-24 pb-20">
      <div className="container mx-auto px-6 max-w-6xl">
        <h1 className="font-serif text-4xl text-gray-900 mb-12 text-center md:text-left">Shopping Bag</h1>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          
          {/* Cart Items List */}
          <div className="flex-1">
            <div className="border-t border-brand-latte/20">
              {cart.map((item) => (
                <div key={item.id} className="py-8 border-b border-brand-latte/20 flex gap-6 md:gap-8 items-center">
                  {/* Image */}
                  <div className="w-24 h-32 md:w-32 md:h-40 bg-brand-grey/5 flex-shrink-0 relative overflow-hidden rounded-[2px]">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-xl text-gray-900 mb-1">{item.name}</h3>
                      <p className="font-sans text-xs text-gray-500 mb-2">{item.collection || 'Blankets'}</p>
                      <p className="font-sans text-sm font-bold text-gray-900">RM {item.price}</p>
                    </div>

                    <div className="flex items-center justify-between md:gap-12">
                      {/* Quantity Control */}
                      <div className="flex items-center border border-brand-latte/30 rounded-full h-10 px-3 gap-4">
                        <button 
                          onClick={() => onUpdateQuantity(item.id, -1)} 
                          className="text-gray-400 hover:text-brand-flamingo transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-sans text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => onUpdateQuantity(item.id, 1)} 
                          className="text-gray-400 hover:text-brand-flamingo transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Remove */}
                      <button 
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-400 hover:text-brand-flamingo transition-colors ml-4 md:ml-0"
                        title="Remove item"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => navigate('/')}
              className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-brand-flamingo transition-colors group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Continue Shopping
            </button>
          </div>

          {/* Order Summary */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-brand-grey/5 p-8 border border-brand-latte/10 sticky top-28">
              <h3 className="font-serif text-2xl text-gray-900 mb-6">Order Summary</h3>
              
              {/* Complimentary Touches Section */}
              <div className="mb-8 pb-6 border-b border-brand-latte/20">
                 <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Complimentary Touches</h4>
                 
                 <div className="space-y-3">
                    {/* Item 1: Box */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-white border border-brand-latte/20 rounded-full text-brand-gold group-hover:text-brand-flamingo transition-colors">
                              <Gift size={12} />
                           </div>
                           <p className="font-serif text-sm text-gray-900">Signature Keepsake Box</p>
                        </div>
                        <span className="font-serif text-sm text-brand-gold italic">x {packagingCount}</span>
                    </div>

                    {/* Item 2: Card */}
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                           <div className="p-1.5 bg-white border border-brand-latte/20 rounded-full text-brand-gold group-hover:text-brand-flamingo transition-colors">
                              <PenTool size={12} />
                           </div>
                           <p className="font-serif text-sm text-gray-900">Gift Card</p>
                        </div>
                        <span className="font-serif text-sm text-brand-gold italic">x {packagingCount}</span>
                    </div>
                 </div>
                 
                 <p className="mt-4 text-[10px] text-gray-400 italic">
                    *One set included for every item.
                 </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-sm font-sans text-gray-600">
                  <span>Subtotal</span>
                  <span>RM {subtotal}</span>
                </div>
                <div className="flex justify-between text-sm font-sans text-gray-600">
                  <span>Shipping</span>
                  <span className="text-xs italic text-gray-400">Calculated at checkout</span>
                </div>
              </div>

              <div className="border-t border-brand-latte/20 pt-6 mb-8">
                <div className="flex justify-between items-end">
                  <span className="font-serif text-lg text-gray-900">Total</span>
                  <div className="text-right">
                    <span className="font-serif text-2xl text-gray-900">RM {subtotal}</span>
                    <span className="text-[10px] text-gray-400 block font-sans">+ Shipping</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2 font-sans text-right">Including taxes & duties</p>
              </div>

              <button 
                onClick={() => navigate('/checkout')}
                className="w-full bg-brand-flamingo text-white h-14 rounded-full flex items-center justify-center gap-3 hover:bg-brand-gold transition-colors font-sans text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg shadow-brand-flamingo/20 group"
              >
                Proceed to Checkout
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="mt-6 text-center">
                 <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
                   Secure checkout powered by CHIP.
                 </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
