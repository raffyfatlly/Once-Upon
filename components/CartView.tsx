
import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { Minus, Plus, Trash2, ArrowRight, ArrowLeft, Gift, PenTool, Clock, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getProductSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

interface CartViewProps {
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export const CartView: React.FC<CartViewProps> = ({ 
  cart, 
  products,
  onUpdateQuantity, 
  onRemoveItem,
  onAddToCart
}) => {
  const navigate = useNavigate();
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Custom logic to identify addons
  const isAddonProduct = (p: CartItem | Product) => {
    if (!p) return false;
    const name = (p.name || '').toLowerCase();
    const collection = (p.collection || '').toLowerCase();
    const category = (p.category || '').toLowerCase();
    return Boolean(p.isCheckoutAddon) || 
           name.includes('perfume') || 
           name.includes('hair oil') || 
           name.includes('oil') || 
           collection.includes('add-on') || 
           collection.includes('addon') || 
           category.includes('add-on') || 
           category.includes('addon');
  };

  // Packaging Logic: 1 set for every 1 main item
  const mainItemsCount = cart.reduce((sum, item) => isAddonProduct(item) ? sum : sum + item.quantity, 0);
  const packagingCount = mainItemsCount;

  // Swaddle & Blanket counts
  const swaddleCount = cart.reduce((sum, item) => {
    if (isAddonProduct(item)) return sum;
    const isBlanket = !item.collection || item.collection === 'Blankets' || item.collection.toLowerCase().includes('blanket') || (item.category && item.category.toLowerCase().includes('blanket'));
    return isBlanket ? sum : sum + item.quantity;
  }, 0);

  const blanketCount = cart.reduce((sum, item) => {
    if (isAddonProduct(item)) return sum;
    const isBlanket = !item.collection || item.collection === 'Blankets' || item.collection.toLowerCase().includes('blanket') || (item.category && item.category.toLowerCase().includes('blanket'));
    return isBlanket ? sum + item.quantity : sum;
  }, 0);

  const checkoutAddons = products?.filter(p => isAddonProduct(p) && p.isLive !== false) || [];
  const visibleAddons = checkoutAddons.filter(addon => !cart.some(item => item.id === addon.id));

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
                    <img src={item.image} alt={item.name} className={`w-full h-full object-cover ${item.isPreOrder ? 'grayscale-[20%]' : ''}`} />
                    {item.isPreOrder && (
                      <div className="absolute bottom-0 left-0 right-0 bg-brand-gold text-white text-[8px] font-bold uppercase tracking-wider text-center py-1">Pre-order</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-xl text-gray-900 mb-1">{item.name}</h3>
                      <p className="font-sans text-xs text-gray-500 mb-2">{item.collection || 'Blankets'}</p>
                      
                      {item.isPreOrder && (
                        <p className="text-xs text-brand-gold font-bold uppercase tracking-wide flex items-center gap-1 mb-2">
                          <Clock size={12} /> Ships in 2 Weeks
                        </p>
                      )}
                      
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
            
            {visibleAddons.length > 0 && (
              <div className="mt-12 bg-brand-grey/5 p-6 border border-brand-latte/10 rounded-[2px]">
                 <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-6 border-b border-brand-latte/20 pb-2">
                   Perfect Additions to Your Order
                 </h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {visibleAddons.map(addon => {
                      const isSoldOut = (addon.stock ?? 0) <= 0;
                      const isBoxAddon = addon.name.toLowerCase().includes('box') || addon.name.toLowerCase().includes('keepsake') || addon.name.toLowerCase().includes('edition');
                      return (
                      <div key={addon.id} className={`flex flex-col bg-white border border-brand-latte/20 rounded-[2px] shadow-sm transition-shadow ${isSoldOut ? 'opacity-60' : 'hover:shadow-md'} overflow-hidden`}>
                         <div className="flex gap-4 items-center p-4">
                            <div 
                              onClick={() => setPreviewImage({ url: addon.image, name: addon.name })}
                              className="flex gap-4 items-center flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                              title={`View ${addon.name} image`}
                            >
                               <img src={addon.image} alt={addon.name} className={`w-16 h-20 object-cover bg-gray-50 border border-brand-latte/10 ${isSoldOut ? 'grayscale' : ''}`} />
                               <div className="flex-1 min-w-0">
                                  <h4 className="font-serif text-sm text-gray-900 hover:text-brand-flamingo transition-colors line-clamp-2 mb-1">{addon.name}</h4>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1">RM {addon.price}</p>
                                  <span className="text-[10px] font-sans font-medium text-brand-flamingo underline">View Image</span>
                               </div>
                            </div>
                            {isSoldOut ? (
                              <span className="text-[10px] font-bold uppercase text-brand-flamingo tracking-wider flex-shrink-0 bg-brand-flamingo/10 px-2 py-1 rounded">
                                Sold Out
                              </span>
                            ) : (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  onAddToCart(addon, 1);
                                }}
                                className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-900 text-white hover:bg-brand-flamingo transition-colors flex-shrink-0"
                                title="Add to order"
                              >
                                <Plus size={14} />
                              </button>
                            )}
                         </div>
                         {isBoxAddon && swaddleCount > 0 && (
                           <div className="bg-brand-gold/10 px-4 py-3 border-t border-brand-gold/20 text-[10px] text-brand-gold font-sans font-medium italic leading-relaxed">
                             Note: Since you are purchasing a Swaddle, you will receive a complimentary Once Upon 1st Edition I Box automatically with your swaddle! There is no need to purchase this unless you want an extra for a blanket purchase.
                           </div>
                         )}
                      </div>
                   )})}
                 </div>
              </div>
            )}

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
              {(swaddleCount > 0 || blanketCount > 0) && (
                 <div className="mb-8 pb-6 border-b border-brand-latte/20 animate-fade-in">
                    <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Complimentary Touches</h4>
                    
                    <div className="space-y-3">
                       {/* Swaddle Box */}
                       {swaddleCount > 0 && (
                          <div className="flex items-center justify-between group animate-fade-in">
                              <div className="flex items-center gap-3">
                                 <div className="p-1.5 bg-white border border-brand-latte/20 rounded-full text-brand-gold group-hover:text-brand-flamingo transition-colors">
                                    <Gift size={12} />
                                 </div>
                                 <div>
                                    <p className="font-serif text-sm text-gray-900">Once Upon 1st Edition Box</p>
                                    <p className="text-[10px] text-brand-gold italic">Free Box with Swaddles</p>
                                 </div>
                              </div>
                              <span className="font-serif text-sm text-brand-gold italic">x {swaddleCount}</span>
                          </div>
                       )}

                       {/* Item 2: Card */}
                       <div className="flex items-center justify-between group animate-fade-in">
                           <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-white border border-brand-latte/20 rounded-full text-brand-gold group-hover:text-brand-flamingo transition-colors">
                                 <PenTool size={12} />
                              </div>
                              <p className="font-serif text-sm text-gray-900">Gift Card</p>
                           </div>
                           <span className="font-serif text-sm text-brand-gold italic">x {swaddleCount + blanketCount}</span>
                       </div>
                    </div>
                    
                    <p className="mt-4 text-[10px] text-gray-400 italic leading-relaxed">
                       {swaddleCount > 0 && blanketCount > 0 
                         ? "*Swaddles include a free Once Upon 1st Edition Box & Gift Card. Blankets include a free Gift Card."
                         : swaddleCount > 0 
                           ? "*Swaddles include a free Once Upon 1st Edition Box & Gift Card."
                           : "*Blankets include a free Gift Card."
                       }
                    </p>
                 </div>
              )}

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

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 text-white/80 hover:bg-brand-flamingo hover:text-white transition-all duration-200 cursor-pointer shadow-lg hover:scale-105"
            title="Close preview"
          >
            <X size={24} />
          </button>
          <div 
            className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center pointer-events-none"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={previewImage.url} 
              alt={previewImage.name} 
              className="max-w-full max-h-full object-contain rounded-[2px] shadow-2xl pointer-events-auto cursor-default select-none animate-scale-up"
            />
          </div>
        </div>
      )}
    </div>
  );
};
