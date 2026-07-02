import React, { useState } from 'react';
import { Product, CartItem, Order } from '../../types';
import { createOrderInDb } from '../../firebase';
import { 
  Plus, Minus, Trash2, CreditCard, QrCode, CheckCircle, ChevronLeft, 
  Tag, Percent, Sparkles, X, Box, Gift, Flame
} from 'lucide-react';

interface POSSystemProps {
  products: Product[];
}

export const POSSystem: React.FC<POSSystemProps> = ({ products }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<'shop' | 'checkout' | 'customer_payment' | 'success'>('shop');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'qr'>('bank_transfer');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShippingPreOrder, setIsShippingPreOrder] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    address: '',
    postcode: '',
    city: '',
    region: 'west' as 'west' | 'east' | 'sg'
  });

  // Sizing option modal state
  const [selectedSizeProduct, setSelectedSizeProduct] = useState<Product | null>(null);

  // Category selection / filter state
  const [activeCategory, setActiveCategory] = useState<'all' | 'swaddles' | 'blankets' | 'addons'>('all');

  // Mobile optimization states
  const [activeMobileTab, setActiveMobileTab] = useState<'products' | 'cart'>('products');
  const [showCheckoutItems, setShowCheckoutItems] = useState(false);

  // Promo and Discount states
  const [isAutoPromoDeleted, setIsAutoPromoDeleted] = useState(false);
  const [isFreeShippingPromoDeleted, setIsFreeShippingPromoDeleted] = useState(false);
  const [posDiscount, setPosDiscount] = useState<{ type: 'percent' | 'flat'; value: number; label: string } | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [customDiscountName, setCustomDiscountName] = useState("Tomorrow's Sale");
  const [customDiscountType, setCustomDiscountType] = useState<'percent' | 'flat'>('percent');
  const [customDiscountValue, setCustomDiscountValue] = useState(10);

  // Category helpers
  const isPerfumeOrHairOil = (p: Product) => {
    const name = (p.name || '').toLowerCase();
    return name.includes('perfume') || name.includes('hair oil') || name.includes('oil');
  };
  const isAddonProduct = (p: Product) => {
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
  const isBlanketProduct = (p: Product) => !p.collection || p.collection === 'Blankets' || p.collection.toLowerCase().includes('blanket') || (p.category && p.category.toLowerCase().includes('blanket'));

  const swaddles = products.filter(p => !isAddonProduct(p) && !isBlanketProduct(p) && !isPerfumeOrHairOil(p) && p.isLive !== false);
  const blankets = products.filter(p => !isAddonProduct(p) && isBlanketProduct(p) && !isPerfumeOrHairOil(p) && p.isLive !== false);

  // Category counts
  const swaddlesCount = products.filter(p => !isAddonProduct(p) && !isBlanketProduct(p) && !isPerfumeOrHairOil(p) && p.isLive !== false).length;
  const blanketsCount = products.filter(p => !isAddonProduct(p) && isBlanketProduct(p) && !isPerfumeOrHairOil(p) && p.isLive !== false).length;
  const addonsCount = products.filter(p => (isAddonProduct(p) || isPerfumeOrHairOil(p)) && p.isLive !== false).length;

  // Sort POS products: First Swaddles (not addon, not blanket), then Blankets (not addon, is blanket), then Add-ons (is addon), then Perfume/Hair Oil (absolutely last)
  // Each group sorted alphabetically A-Z (top to bottom) by name
  const sortedProducts = [...products].sort((a, b) => {
    const aIsPerfumeOrOil = isPerfumeOrHairOil(a);
    const bIsPerfumeOrOil = isPerfumeOrHairOil(b);
    const aIsAddon = isAddonProduct(a);
    const bIsAddon = isAddonProduct(b);
    const aIsBlanket = isBlanketProduct(a);
    const bIsBlanket = isBlanketProduct(b);

    const aGroup = aIsPerfumeOrOil ? 3 : (aIsAddon ? 2 : (aIsBlanket ? 1 : 0));
    const bGroup = bIsPerfumeOrOil ? 3 : (bIsAddon ? 2 : (bIsBlanket ? 1 : 0));

    if (aGroup !== bGroup) {
      return aGroup - bGroup;
    }

    return a.name.localeCompare(b.name);
  });

  // Filter products by active category
  const displayedProducts = sortedProducts.filter(p => {
    if (activeCategory === 'swaddles') {
      return !isAddonProduct(p) && !isBlanketProduct(p) && !isPerfumeOrHairOil(p);
    }
    if (activeCategory === 'blankets') {
      return !isAddonProduct(p) && isBlanketProduct(p) && !isPerfumeOrHairOil(p);
    }
    if (activeCategory === 'addons') {
      return isAddonProduct(p) || isPerfumeOrHairOil(p);
    }
    return true; // 'all'
  });

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleAddSizedProductToCart = (product: Product, size: 'baby' | 'adult') => {
    const isAdult = size === 'adult';
    const finalPrice = isAdult ? (product.adultPrice || 108) : (product.babyPrice || 88);
    const finalSizeDesc = isAdult ? (product.adultSizeDesc || '150 cm x 100 cm') : (product.babySizeDesc || '70 cm x 100 cm');
    const finalName = `${product.name} (${isAdult ? 'Adult' : 'Baby'})`;
    const itemId = `${product.id}-${size}`;

    setCart(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        return prev.map(item => item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, {
        ...product,
        id: itemId,
        baseProductId: product.id,
        name: finalName,
        price: finalPrice,
        size: finalSizeDesc,
        sizeOption: size,
        quantity: 1
      }];
    });
    setSelectedSizeProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Auto RM 8 discount for each blanket or swaddle (not addon, not perfume or hair oil)
  const autoPromoDiscountAmount = isAutoPromoDeleted 
    ? 0 
    : cart.reduce((sum, item) => {
        if (!isAddonProduct(item) && !isPerfumeOrHairOil(item)) {
          return sum + (8 * item.quantity);
        }
        return sum;
      }, 0);

  // Shipping cost if shipping pre-order
  const getStandardShippingCost = () => {
    if (!isShippingPreOrder) return 0;
    const region = shippingDetails.region;
    if (region === 'sg') {
      if (totalItems === 1) return 30;
      if (totalItems <= 3) return 45;
      if (totalItems <= 6) return 65;
      return 65 + Math.ceil((totalItems - 6) / 3) * 15;
    } else if (region === 'east') {
      if (totalItems === 1) return 15;
      if (totalItems <= 3) return 18;
      if (totalItems <= 6) return 20;
      return 20 + Math.ceil((totalItems - 6) / 3) * 5;
    } else {
      if (totalItems === 1) return 8;
      if (totalItems <= 3) return 10;
      if (totalItems <= 6) return 12;
      return 12 + Math.ceil((totalItems - 6) / 3) * 2;
    }
  };

  const standardShippingCost = getStandardShippingCost();
  const freeShippingDiscountAmount = (isShippingPreOrder && !isFreeShippingPromoDeleted) ? standardShippingCost : 0;
  const actualShippingCost = isShippingPreOrder ? (standardShippingCost - freeShippingDiscountAmount) : 0;

  const customDiscountAmount = posDiscount 
    ? (posDiscount.type === 'percent' ? (subtotal * posDiscount.value / 100) : posDiscount.value)
    : 0;

  const total = Math.max(0, subtotal + actualShippingCost - autoPromoDiscountAmount - customDiscountAmount);

  const handleConfirmOrder = async () => {
    setIsProcessing(true);
    try {
      let promoNotes = [];
      if (isShippingPreOrder) {
        promoNotes.push('[Pre-Order Shipping]');
        if (!isFreeShippingPromoDeleted) {
          promoNotes.push(`[Free Shipping Promo applied - Saved RM ${standardShippingCost.toFixed(2)}]`);
        }
      }
      if (!isAutoPromoDeleted && autoPromoDiscountAmount > 0) {
        promoNotes.push(`[Auto Blanket/Swaddle Promo applied - Saved RM ${autoPromoDiscountAmount.toFixed(2)}]`);
      }
      if (posDiscount) {
        promoNotes.push(`[POS Discount Applied: ${posDiscount.label} (${posDiscount.type === 'percent' ? `${posDiscount.value}%` : `RM ${posDiscount.value}`} off - Saved RM ${customDiscountAmount.toFixed(2)})]`);
      }

      const formattedShippingAddress = isShippingPreOrder
        ? `${shippingDetails.address}, ${shippingDetails.postcode} ${shippingDetails.city}, ${shippingDetails.region === 'sg' ? 'Singapore' : shippingDetails.region === 'east' ? 'East Malaysia' : 'West Malaysia'}`
        : 'In-Store';

      const orderData: Omit<Order, 'id'> = {
        customerName: customerInfo.name || 'POS Customer',
        customerEmail: customerInfo.email || 'pos@store.local',
        customerPhone: customerInfo.phone || '0000000000',
        items: cart.map(item => ({
          ...item,
          isPreOrder: isShippingPreOrder ? true : item.isPreOrder
        })),
        total,
        status: 'paid',
        date: new Date().toISOString(),
        shippingAddress: formattedShippingAddress,
        source: 'pos',
        paymentMethod: paymentMethod
      };

      if (promoNotes.length > 0) {
        orderData.adminNotes = promoNotes.join(' ');
      }

      await createOrderInDb(orderData);
      setView('success');
      setCart([]);
      setPosDiscount(null);
      setCustomerInfo({ name: '', phone: '', email: '' });
      setIsShippingPreOrder(false);
      setShippingDetails({ address: '', postcode: '', city: '', region: 'west' });
      setIsAutoPromoDeleted(false);
      setIsFreeShippingPromoDeleted(false);
    } catch (error: any) {
      alert("Failed to process order: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (view === 'success') {
    return (
      <div className="bg-white p-12 text-center rounded shadow-sm border border-brand-latte/20 flex flex-col items-center">
        <CheckCircle className="text-green-500 w-24 h-24 mb-6" />
        <h2 className="font-serif text-3xl mb-2">Purchase Complete!</h2>
        <p className="text-gray-500 mb-8">The POS order has been successfully registered.</p>
        <button 
          onClick={() => setView('shop')}
          className="bg-brand-flamingo text-white px-8 py-4 font-bold uppercase tracking-widest text-sm"
        >
          New Sale
        </button>
      </div>
    );
  }

  if (view === 'customer_payment') {
    return (
      <div className="bg-white min-h-[70vh] rounded shadow-sm border border-brand-latte/20 flex flex-col">
        <div className="p-4 md:p-6 border-b border-brand-latte/20 flex flex-col sm:flex-row justify-between items-center gap-3 bg-brand-grey/10">
          <button onClick={() => setView('checkout')} className="text-gray-500 hover:text-brand-flamingo flex items-center gap-2 self-start sm:self-auto text-sm font-bold uppercase tracking-wider">
            <ChevronLeft size={18} /> Back to Cashier
          </button>
          <div className="font-serif text-xl md:text-2xl text-center">Customer Checkout</div>
          <div className="hidden sm:block w-24"></div>
        </div>

        <div className="flex-1 p-5 md:p-12 flex flex-col items-center justify-center text-center">
          <h3 className="font-sans font-bold text-gray-500 tracking-widest uppercase mb-2 md:mb-4 text-xs md:text-sm">Total Amount Due</h3>
          <div className="text-4xl md:text-5xl font-script text-brand-flamingo mb-6 md:mb-12">RM {total.toFixed(2)}</div>

          {paymentMethod === 'bank_transfer' ? (
            <div className="bg-brand-grey/10 p-5 md:p-8 rounded border border-brand-latte/30 w-full max-w-md">
              <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-brand-gold mx-auto mb-4" />
              <h4 className="font-serif text-lg md:text-xl mb-4 md:mb-6">Bank Transfer Details</h4>
              <div className="space-y-3 md:space-y-4 text-left">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bank Name</p>
                  <p className="text-base md:text-lg font-mono">MAYBANK</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Name</p>
                  <p className="text-base md:text-lg font-mono">Vanillicious Enterprise</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Number</p>
                  <p className="text-base md:text-lg font-mono font-bold tracking-widest text-brand-flamingo">5621 8832 7902</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-brand-grey/10 p-5 md:p-8 rounded border border-brand-latte/30 w-full max-w-md flex flex-col items-center">
              <QrCode className="w-10 h-10 md:w-12 md:h-12 text-brand-gold mx-auto mb-4" />
              <h4 className="font-serif text-lg md:text-xl mb-4 md:mb-6">Scan to Pay (DuitNow QR)</h4>
              <div className="w-56 h-56 md:w-64 md:h-64 bg-white border border-gray-200 flex items-center justify-center p-3 md:p-4">
                <img 
                  src="https://i.postimg.cc/q7S8hzvt/qr-jpeg.png" 
                  alt="DuitNow QR" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="mt-8 md:mt-12 w-full max-w-md">
            <button 
              onClick={handleConfirmOrder}
              disabled={isProcessing}
              className="w-full bg-brand-flamingo text-white py-3.5 md:py-4 font-bold uppercase tracking-widest disabled:opacity-50 text-xs md:text-sm"
            >
              {isProcessing ? 'Processing...' : 'Cashier: Confirm Payment Received'}
            </button>
            <p className="text-[10px] md:text-xs text-gray-400 mt-4 italic">Please hand the device back to the cashier to confirm the order.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'checkout') {
    return (
      <div className="bg-white min-h-[70vh] rounded shadow-sm border border-brand-latte/20 flex flex-col md:flex-row">
        {/* Order Summary */}
        <div className="flex-1 p-4 md:p-8 border-r border-brand-latte/20">
          <button onClick={() => setView('shop')} className="text-gray-500 hover:text-brand-flamingo flex items-center gap-2 mb-4 md:mb-6 text-xs md:text-sm font-bold uppercase tracking-wider">
            <ChevronLeft size={16} /> Back to POS Menu
          </button>
          
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="font-serif text-xl md:text-2xl font-medium text-gray-900">Order Summary</h2>
            <button 
              type="button"
              onClick={() => setShowCheckoutItems(!showCheckoutItems)}
              className="md:hidden text-xs text-brand-flamingo font-bold uppercase tracking-wider bg-brand-flamingo/5 px-2.5 py-1.5 rounded border border-brand-flamingo/10"
            >
              {showCheckoutItems ? 'Hide Items' : `Show Items (${cart.length})`}
            </button>
          </div>

          <div className={`space-y-4 mb-6 md:mb-8 max-h-[40vh] overflow-y-auto pr-4 ${showCheckoutItems ? 'block' : 'hidden md:block'}`}>
            {cart.map(item => {
              const isAddon = Boolean(item.isCheckoutAddon);
              const isBlanket = isBlanketProduct(item);
              const itemTag = isAddon ? 'Add-on' : (isBlanket ? 'Blanket' : 'Swaddle');
              return (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-brand-latte/10">
                  <div className="flex gap-3 md:gap-4 items-center flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                        <p className="font-bold text-xs md:text-sm text-gray-900">{item.name}</p>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded tracking-widest border ${
                          isAddon 
                            ? 'bg-gray-100 text-gray-500 border-gray-200' 
                            : isBlanket 
                              ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' 
                              : 'bg-brand-flamingo/10 text-brand-flamingo border-brand-flamingo/20'
                        }`}>
                          {itemTag}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-500 font-mono mt-0.5">RM {item.price.toFixed(2)} x {item.quantity}</p>
                    </div>
                  </div>
                  <div className="font-bold font-mono text-xs md:text-sm">
                    RM {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="border-t border-brand-latte/20 pt-4 md:pt-6 space-y-2">
            <div className="flex justify-between items-center text-xs md:text-sm">
              <span className="font-bold text-gray-400 uppercase tracking-widest text-[10px] md:text-xs">Subtotal</span>
              <span className="font-mono text-gray-600">RM {subtotal.toFixed(2)}</span>
            </div>

            {/* Auto RM 8 discount for blankets/swaddles */}
            {!isAutoPromoDeleted && autoPromoDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-xs md:text-sm text-brand-flamingo">
                <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">🏷️ RM 8 Auto Promo</span>
                <span className="font-mono">- RM {autoPromoDiscountAmount.toFixed(2)}</span>
              </div>
            )}

            {/* Pre-Order Shipping and Free Shipping Discount */}
            {isShippingPreOrder && (
              <>
                <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                  <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">Shipping</span>
                  <span className="font-mono">RM {standardShippingCost.toFixed(2)}</span>
                </div>
                {!isFreeShippingPromoDeleted && freeShippingDiscountAmount > 0 && (
                  <div className="flex justify-between items-center text-xs md:text-sm text-green-600">
                    <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">📦 Free Shipping</span>
                    <span className="font-mono">- RM {freeShippingDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
              </>
            )}
            
            {posDiscount && (
              <div className="flex justify-between items-center text-xs md:text-sm text-brand-flamingo">
                <span className="font-bold uppercase tracking-widest text-[10px] md:text-xs">🏷️ Discount ({posDiscount.label})</span>
                <span className="font-mono">- RM {customDiscountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center border-t border-brand-latte/10 pt-3 md:pt-4 mt-2">
              <span className="font-bold text-gray-500 uppercase tracking-widest text-xs md:text-sm">Total Due</span>
              <span className="font-script text-2xl md:text-3xl text-brand-flamingo">RM {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Controls */}
        <div className="flex-1 p-4 md:p-8 bg-brand-grey/5">
          <h2 className="font-serif text-xl md:text-2xl mb-4 md:mb-6 font-medium text-gray-900">Checkout Details</h2>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Info {isShippingPreOrder ? '(Required for Shipping)' : '(Optional)'}</label>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="Name" 
                className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                value={customerInfo.name}
                onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
              />
              <input 
                type="tel" 
                placeholder="Phone" 
                className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                value={customerInfo.phone}
                onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
              />
              <input 
                type="email" 
                placeholder="Email" 
                className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                value={customerInfo.email}
                onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery Option</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={() => setIsShippingPreOrder(false)}
                className={`p-3.5 border text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${!isShippingPreOrder ? 'border-brand-flamingo bg-brand-flamingo/5 text-brand-flamingo' : 'border-brand-latte/30 bg-white hover:border-gray-300 text-gray-500'}`}
              >
                In-Store Pickup
              </button>
              <button 
                type="button"
                onClick={() => setIsShippingPreOrder(true)}
                className={`p-3.5 border text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 ${isShippingPreOrder ? 'border-brand-flamingo bg-brand-flamingo/5 text-brand-flamingo' : 'border-brand-latte/30 bg-white hover:border-gray-300 text-gray-500'}`}
              >
                Pre-Order Shipping
              </button>
            </div>

            {isShippingPreOrder && (
              <div className="mt-4 space-y-3 bg-white p-4 border border-brand-latte/20 rounded animate-fade-in text-left">
                <span className="block text-[10px] font-bold text-brand-gold uppercase tracking-widest mb-1">📦 Delivery Details</span>
                <input 
                  type="text" 
                  placeholder="Street Address" 
                  className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                  value={shippingDetails.address}
                  onChange={e => setShippingDetails({...shippingDetails, address: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input 
                    type="text" 
                    placeholder="Postcode" 
                    className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                    value={shippingDetails.postcode}
                    onChange={e => setShippingDetails({...shippingDetails, postcode: e.target.value})}
                  />
                  <input 
                    type="text" 
                    placeholder="City" 
                    className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                    value={shippingDetails.city}
                    onChange={e => setShippingDetails({...shippingDetails, city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Region</label>
                  <select 
                    className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white"
                    value={shippingDetails.region}
                    onChange={e => setShippingDetails({...shippingDetails, region: e.target.value as any})}
                  >
                    <option value="west">West Malaysia</option>
                    <option value="east">East Malaysia</option>
                    <option value="sg">Singapore</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="mb-8">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-4 border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'bank_transfer' ? 'border-brand-flamingo bg-brand-flamingo/5 text-brand-flamingo' : 'border-brand-latte/30 bg-white hover:border-gray-300 text-gray-500'}`}
              >
                <CreditCard size={24} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Bank Transfer</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('qr')}
                className={`p-4 border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'qr' ? 'border-brand-flamingo bg-brand-flamingo/5 text-brand-flamingo' : 'border-brand-latte/30 bg-white hover:border-gray-300 text-gray-500'}`}
              >
                <QrCode size={24} />
                <span className="text-[10px] font-bold uppercase tracking-widest">DuitNow QR</span>
              </button>
            </div>
          </div>

          <button 
            onClick={() => {
              if (isShippingPreOrder) {
                if (!customerInfo.name.trim() || !customerInfo.phone.trim() || !customerInfo.email.trim()) {
                  alert("Customer Name, Phone, and Email are required for Pre-Order Shipping!");
                  return;
                }
                if (!shippingDetails.address.trim() || !shippingDetails.postcode.trim() || !shippingDetails.city.trim()) {
                  alert("Please enter full shipping address details (Address, Postcode, City)!");
                  return;
                }
              }
              setView('customer_payment');
            }}
            className="w-full bg-gray-900 text-white py-4 font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-flamingo transition-colors"
          >
            Pass iPad to Customer <ChevronLeft size={16} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  // SHOP VIEW (Mobile and iPad/Desktop optimized)
  return (
    <div className="flex flex-col gap-4 md:gap-6 min-h-[75vh] md:h-[85vh] pb-16 md:pb-0 relative">
      {/* Mobile Tab Switcher */}
      <div className="md:hidden grid grid-cols-2 gap-2 bg-brand-grey/5 p-1 rounded-lg border border-brand-latte/10">
        <button
          type="button"
          onClick={() => setActiveMobileTab('products')}
          className={`py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeMobileTab === 'products'
              ? 'bg-brand-flamingo text-white shadow-sm font-semibold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🛍️ Products</span>
          {products.length > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              activeMobileTab === 'products' ? 'bg-white/20 text-white' : 'bg-brand-flamingo/10 text-brand-flamingo'
            }`}>
              {displayedProducts.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab('cart')}
          className={`py-2.5 px-4 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
            activeMobileTab === 'cart'
              ? 'bg-brand-flamingo text-white shadow-sm font-semibold'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🛒 Cart</span>
          {totalItems > 0 && (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
              activeMobileTab === 'cart' ? 'bg-white/20 text-white' : 'bg-brand-flamingo text-white'
            }`}>
              {totalItems}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 h-full w-full">
        {/* Products Grid Column */}
        <div className={`flex-[2] bg-white border border-brand-latte/20 rounded shadow-sm overflow-y-auto p-4 md:p-6 ${
          activeMobileTab === 'products' ? 'block' : 'hidden md:block'
        }`}>
          
          {/* AUTO PROMO BANNER */}
          <div 
            className="border border-dashed border-brand-flamingo/50 bg-[#fffdfa] p-3 md:p-4 mb-4 md:mb-6 relative"
            style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 10px rgba(230,120,110,0.04)'
            }}
          >
            <div className="absolute top-2.5 right-4 text-[9px] font-sans font-bold uppercase tracking-widest bg-brand-flamingo text-white px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
              <Sparkles size={8} /> Active Promo
            </div>
            
            <h3 className="font-serif text-sm md:text-base text-gray-900 mb-1 flex items-center gap-1.5 tracking-wide font-semibold">
              🎁 Auto POS Discount Active
            </h3>
            <p className="text-xs text-gray-600 font-sans leading-relaxed">
              Every swaddle and blanket added to the order automatically receives an <strong className="text-brand-flamingo">RM 8.00 discount each</strong>. 
              Pre-order shipping options also automatically receive <strong className="text-brand-gold">Free Shipping</strong>.
            </p>
          </div>

          {/* SECTION 1: STANDARD PRODUCTS MENU */}
          <div id="pos-menu-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h2 className="font-serif text-xl md:text-2xl text-gray-900 tracking-wide font-medium">POS Menu</h2>
          </div>

          {/* CATEGORY CARD SELECTORS */}
          <div id="pos-category-selector" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3 mb-6">
            <button
              id="pos-cat-swaddles"
              type="button"
              onClick={() => setActiveCategory('swaddles')}
              className={`p-2.5 md:p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeCategory === 'swaddles'
                  ? 'border-brand-flamingo bg-brand-flamingo/5 text-brand-flamingo shadow-sm scale-[1.02] ring-1 ring-brand-flamingo/50'
                  : 'border-brand-latte/20 bg-white hover:border-brand-flamingo/40 text-gray-700 hover:bg-gray-50/50'
              }`}
            >
              <span className="text-lg mb-1">🌸</span>
              <span className="font-serif text-xs font-semibold">Swaddles</span>
              <span className="text-[9px] font-mono mt-1 opacity-70 bg-brand-flamingo/10 text-brand-flamingo px-2 py-0.5 rounded-full">{swaddlesCount} Designs</span>
            </button>
            
            <button
              id="pos-cat-blankets"
              type="button"
              onClick={() => setActiveCategory('blankets')}
              className={`p-2.5 md:p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeCategory === 'blankets'
                  ? 'border-brand-gold bg-brand-gold/5 text-brand-gold shadow-sm scale-[1.02] ring-1 ring-brand-gold/50'
                  : 'border-brand-latte/20 bg-white hover:border-brand-gold/40 text-gray-700 hover:bg-gray-50/50'
              }`}
            >
              <span className="text-lg mb-1">🧸</span>
              <span className="font-serif text-xs font-semibold">Blankets</span>
              <span className="text-[9px] font-mono mt-1 opacity-70 bg-brand-gold/10 text-brand-gold px-2 py-0.5 rounded-full">{blanketsCount} Designs</span>
            </button>

            <button
              id="pos-cat-addons"
              type="button"
              onClick={() => setActiveCategory('addons')}
              className={`p-2.5 md:p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeCategory === 'addons'
                  ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm scale-[1.02] ring-1 ring-purple-500/50'
                  : 'border-brand-latte/20 bg-white hover:border-purple-300 text-gray-700 hover:bg-gray-50/50'
              }`}
            >
              <span className="text-lg mb-1">💝</span>
              <span className="font-serif text-xs font-semibold">Add-ons & Wellness</span>
              <span className="text-[9px] font-mono mt-1 opacity-70 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{addonsCount} Items</span>
            </button>

            <button
              id="pos-cat-all"
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`p-2.5 md:p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                activeCategory === 'all'
                  ? 'border-gray-900 bg-gray-50 text-gray-900 shadow-sm scale-[1.02] ring-1 ring-gray-900/50'
                  : 'border-brand-latte/20 bg-white hover:border-gray-400 text-gray-700 hover:bg-gray-50/50'
              }`}
            >
              <span className="text-lg mb-1">✨</span>
              <span className="font-serif text-xs font-semibold">All Products</span>
              <span className="text-[9px] font-mono mt-1 opacity-70 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{products.length} Total</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {displayedProducts.map(product => {
              const isAddon = isAddonProduct(product) || isPerfumeOrHairOil(product);
              const isBlanket = isBlanketProduct(product);
              const collectionTag = isAddon ? 'Add-on' : (isBlanket ? 'Blanket' : 'Swaddle');
              return (
                <button 
                  key={product.id} 
                  onClick={() => {
                    if (product.hasSizes) {
                      setSelectedSizeProduct(product);
                    } else {
                      handleAddToCart(product);
                    }
                  }}
                  className="text-left group border border-brand-latte/20 rounded overflow-hidden hover:border-brand-flamingo transition-colors flex flex-col h-full bg-gray-50 relative cursor-pointer"
                >
                  <div className="aspect-[4/3] bg-gray-200 relative overflow-hidden">
                    <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <span className={`text-[8px] font-sans font-bold px-1.5 py-0.5 uppercase tracking-widest rounded-sm ${
                        isAddon 
                          ? 'bg-gray-100 text-gray-600 border border-gray-200' 
                          : isBlanket 
                            ? 'bg-brand-gold text-white' 
                            : 'bg-brand-flamingo text-white'
                      }`}>
                        {collectionTag}
                      </span>
                      {product.isPosOnly && (
                        <span className="bg-black text-white text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-widest rounded-sm">POS ONLY</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-grow justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight mb-2">{product.name}</h3>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="font-mono text-brand-flamingo text-xs font-bold">
                        {product.hasSizes 
                          ? `RM ${product.babyPrice || 88} - RM ${product.adultPrice || 108}` 
                          : `RM ${product.price}`}
                      </div>
                      {product.hasSizes && (
                        <span className="text-[8px] font-sans font-bold bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-1 rounded uppercase tracking-wider">Sizes</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {displayedProducts.length === 0 && (
               <div className="col-span-full py-12 text-center text-gray-400 italic">No products available in this category.</div>
            )}
          </div>
        </div>

        {/* Cart Sidebar Column */}
        <div className={`flex-1 bg-white border border-brand-latte/20 rounded shadow-sm flex flex-col w-full md:max-w-sm ${
          activeMobileTab === 'cart' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="p-4 border-b border-brand-latte/20 bg-brand-grey/5 flex justify-between items-center">
            <h2 className="font-serif text-lg md:text-xl font-medium text-gray-900 tracking-wide">Current Order</h2>
            <button
              type="button"
              onClick={() => setActiveMobileTab('products')}
              className="md:hidden text-xs text-brand-flamingo font-bold uppercase tracking-wider flex items-center gap-1 bg-brand-flamingo/5 px-2.5 py-1.5 rounded border border-brand-flamingo/10"
            >
              <ChevronLeft size={14} /> Add Items
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 italic text-sm mt-12">
                Cart is empty. Tap products to add.
                <button 
                  type="button"
                  onClick={() => setActiveMobileTab('products')}
                  className="md:hidden mt-4 block mx-auto bg-brand-flamingo/10 text-brand-flamingo px-4 py-2 rounded font-bold text-xs uppercase tracking-widest"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              cart.map(item => {
                const isAddon = isAddonProduct(item) || isPerfumeOrHairOil(item);
                const isBlanket = isBlanketProduct(item);
                const itemTag = isAddon ? 'Add-on' : (isBlanket ? 'Blanket' : 'Swaddle');
                return (
                  <div key={item.id} className="flex flex-col gap-2 p-3 border border-brand-latte/20 rounded bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-gray-900 leading-tight">{item.name}</span>
                          <span className={`text-[7px] font-bold uppercase px-1 py-0.2 rounded border whitespace-nowrap ${
                            isAddon 
                              ? 'bg-gray-100 text-gray-500 border-gray-200' 
                              : isBlanket 
                                ? 'bg-brand-gold/10 text-brand-gold border-brand-gold/20' 
                                : 'bg-brand-flamingo/10 text-brand-flamingo border-brand-flamingo/20'
                          }`}>
                            {itemTag}
                          </span>
                        </div>
                        {item.size && (
                          <p className="text-[10px] text-gray-400 font-sans mt-0.5">Size: {item.size}</p>
                        )}
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 cursor-pointer p-1.5 -mr-1.5 -mt-1.5"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <div className="font-mono text-xs font-bold text-brand-flamingo">RM {(item.price * item.quantity).toFixed(2)}</div>
                      <div className="flex items-center gap-3 bg-white border border-brand-latte/20 rounded-full px-2.5 py-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-500 p-1 hover:text-brand-flamingo cursor-pointer flex items-center justify-center"><Minus size={12} /></button>
                        <span className="text-xs font-bold w-4 text-center select-none">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-500 p-1 hover:text-brand-flamingo cursor-pointer flex items-center justify-center"><Plus size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
  
          {/* Sidebar Footer and Totals */}
          <div className="p-4 border-t border-brand-latte/20 bg-brand-grey/5">
            <div className="space-y-2 mb-4 border-b border-brand-latte/10 pb-3">
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span className="font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                <span className="font-mono">RM {subtotal.toFixed(2)}</span>
              </div>
  
              {/* Auto RM 8 discount for blankets/swaddles */}
              {!isAutoPromoDeleted && autoPromoDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-brand-flamingo text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase bg-brand-flamingo/10 px-1.5 py-0.5 rounded tracking-wider">🏷️ RM 8 Auto Promo</span>
                    <button 
                      onClick={() => setIsAutoPromoDeleted(true)}
                      className="text-[10px] text-red-500 hover:underline font-bold uppercase tracking-wider cursor-pointer p-1.5 -my-1"
                    >
                      [Delete]
                    </button>
                  </div>
                  <span className="font-mono font-bold">- RM {autoPromoDiscountAmount.toFixed(2)}</span>
                </div>
              )}
  
              {/* Pre-Order Shipping and Free Shipping Discount */}
              {isShippingPreOrder && (
                <>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="font-bold uppercase tracking-widest text-[10px]">Shipping</span>
                    <span className="font-mono">RM {standardShippingCost.toFixed(2)}</span>
                  </div>
                  {!isFreeShippingPromoDeleted && freeShippingDiscountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase bg-green-50 border border-green-200 px-1.5 py-0.5 rounded tracking-wider">📦 Free Shipping</span>
                        <button 
                          onClick={() => setIsFreeShippingPromoDeleted(true)}
                          className="text-[10px] text-red-500 hover:underline font-bold uppercase tracking-wider cursor-pointer p-1.5 -my-1"
                        >
                          [Delete]
                        </button>
                      </div>
                      <span className="font-mono font-bold">- RM {freeShippingDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
  
              {posDiscount && (
                <div className="flex justify-between items-center text-brand-flamingo text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase bg-brand-flamingo/10 px-1.5 py-0.5 rounded tracking-wider">🏷️ {posDiscount.label}</span>
                    <button 
                      onClick={() => setPosDiscount(null)}
                      className="text-[10px] text-red-500 hover:underline font-bold uppercase tracking-wider cursor-pointer p-1.5 -my-1"
                    >
                      [Delete]
                    </button>
                  </div>
                  <span className="font-mono font-bold">- RM {customDiscountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
  
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Total Due</span>
              <span className="font-script text-2xl text-brand-flamingo">RM {total.toFixed(2)}</span>
            </div>
  
            {/* Promo Re-apply & Discount Buttons */}
            <div className="space-y-1.5 mb-3">
              {(isAutoPromoDeleted && autoPromoDiscountAmount > 0) && (
                <button 
                  type="button"
                  onClick={() => setIsAutoPromoDeleted(false)}
                  className="w-full bg-brand-flamingo/5 border border-brand-flamingo/20 text-brand-flamingo py-2 font-bold uppercase tracking-widest text-[10px] rounded hover:bg-brand-flamingo/10 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Tag size={10} /> Re-apply RM 8 Auto Promo
                </button>
              )}
              {(isShippingPreOrder && isFreeShippingPromoDeleted && standardShippingCost > 0) && (
                <button 
                  type="button"
                  onClick={() => setIsFreeShippingPromoDeleted(false)}
                  className="w-full bg-green-50 border border-green-200 text-green-700 py-2 font-bold uppercase tracking-widest text-[10px] rounded hover:bg-green-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Box size={10} /> Re-apply Free Shipping Promo
                </button>
              )}
              {!posDiscount && (
                <button 
                  type="button"
                  onClick={() => setShowDiscountModal(true)}
                  className="w-full bg-white border border-brand-flamingo/30 text-brand-flamingo py-2 font-bold uppercase tracking-widest text-[10px] rounded hover:bg-brand-flamingo/5 transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Percent size={10} /> Apply Custom/Promo Discount
                </button>
              )}
            </div>
  
            <button 
              onClick={() => setView('checkout')}
              disabled={cart.length === 0}
              className="w-full bg-brand-flamingo text-white py-3 font-bold uppercase tracking-widest text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-flamingo/90 transition-colors cursor-pointer"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar for Mobile */}
      {activeMobileTab === 'products' && totalItems > 0 && (
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-40 animate-slide-up">
          <button
            type="button"
            onClick={() => setActiveMobileTab('cart')}
            className="w-full bg-brand-flamingo text-white py-3.5 px-5 rounded-full shadow-lg flex items-center justify-between border border-brand-flamingo/20 hover:bg-brand-flamingo/90 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 text-white text-xs font-bold font-mono px-2 py-0.5 rounded-full">
                {totalItems}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">Review Order</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-mono text-sm font-bold">RM {total.toFixed(2)}</span>
              <ChevronLeft size={16} className="rotate-180" />
            </div>
          </button>
        </div>
      )}

      {/* --- POPUP MODAL 1: BLANKET SIZE VARIANT SELECTOR --- */}
      {selectedSizeProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded max-w-md w-full p-6 border border-brand-latte/30 shadow-xl relative">
            <button 
              onClick={() => setSelectedSizeProduct(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <h3 className="font-serif text-xl text-gray-900 mb-2 font-medium">Select Size Variant</h3>
            <p className="text-xs text-brand-gold font-script text-base mb-6">{selectedSizeProduct.name}</p>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Baby size option button */}
              <button 
                onClick={() => handleAddSizedProductToCart(selectedSizeProduct, 'baby')}
                className="border border-brand-latte/30 hover:border-brand-flamingo p-4 rounded text-left flex flex-col justify-between hover:bg-brand-flamingo/5 transition-all cursor-pointer"
              >
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Baby Blanket</span>
                  <span className="block font-bold text-sm text-gray-900">{selectedSizeProduct.babySizeDesc || '70 cm × 100 cm'}</span>
                </div>
                <div className="mt-4 font-mono font-bold text-brand-flamingo text-sm">RM {selectedSizeProduct.babyPrice || 88}</div>
              </button>

              {/* Adult size option button */}
              <button 
                onClick={() => handleAddSizedProductToCart(selectedSizeProduct, 'adult')}
                className="border border-brand-latte/30 hover:border-brand-flamingo p-4 rounded text-left flex flex-col justify-between hover:bg-brand-flamingo/5 transition-all cursor-pointer"
              >
                <div>
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Adult Blanket</span>
                  <span className="block font-bold text-sm text-gray-900">{selectedSizeProduct.adultSizeDesc || '150 cm × 100 cm'}</span>
                </div>
                <div className="mt-4 font-mono font-bold text-brand-flamingo text-sm">RM {selectedSizeProduct.adultPrice || 108}</div>
              </button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedSizeProduct(null)}
                className="border border-brand-latte/30 px-4 py-2 rounded text-xs uppercase font-bold tracking-wider text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- POPUP MODAL 3: DISCOUNT CONTROLLER --- */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded max-w-md w-full p-6 border border-brand-latte/30 shadow-xl relative">
            <button 
              onClick={() => setShowDiscountModal(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <h3 className="font-serif text-xl text-gray-900 mb-2 font-medium">Apply POS Discount</h3>
            <p className="text-xs text-gray-400 mb-6">Apply custom discounts directly.</p>
            
            <div className="my-4 pt-4">
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">🛠️ Or Custom Discount</span>
              
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Discount Label</label>
                  <input 
                    type="text" 
                    value={customDiscountName}
                    onChange={e => setCustomDiscountName(e.target.value)}
                    className="w-full border p-2.5 text-sm outline-none focus:border-brand-flamingo bg-white"
                    placeholder="e.g. VIP Promo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Type</label>
                    <select 
                      value={customDiscountType} 
                      onChange={e => setCustomDiscountType(e.target.value as 'percent' | 'flat')}
                      className="w-full border p-2.5 text-sm outline-none focus:border-brand-flamingo bg-white"
                    >
                      <option value="percent">Percent (%)</option>
                      <option value="flat">Flat RM (RM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Value</label>
                    <input 
                      type="number" 
                      value={customDiscountValue}
                      onChange={e => setCustomDiscountValue(Number(e.target.value))}
                      className="w-full border p-2.5 text-sm outline-none focus:border-brand-flamingo bg-white font-mono"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-brand-latte/10">
              <button 
                onClick={() => setShowDiscountModal(false)}
                className="border border-brand-latte/30 px-4 py-2.5 rounded text-xs uppercase font-bold tracking-wider text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (customDiscountValue > 0) {
                    setPosDiscount({
                      type: customDiscountType,
                      value: customDiscountValue,
                      label: customDiscountName || 'Discount'
                    });
                  }
                  setShowDiscountModal(false);
                }}
                className="bg-brand-flamingo text-white px-5 py-2.5 rounded text-xs uppercase font-bold tracking-wider cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

