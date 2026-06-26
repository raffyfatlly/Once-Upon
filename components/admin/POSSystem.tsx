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

  // Sizing option modal state
  const [selectedSizeProduct, setSelectedSizeProduct] = useState<Product | null>(null);

  // Bundle selection modal states
  const [selectedBundleType, setSelectedBundleType] = useState<'two_swaddles' | 'blanket_swaddle' | 'adult_baby_blanket' | null>(null);
  const [bundleItem1, setBundleItem1] = useState<string>('');
  const [bundleItem2, setBundleItem2] = useState<string>('');

  // Discount states
  const [posDiscount, setPosDiscount] = useState<{ type: 'percent' | 'flat'; value: number; label: string } | null>(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [customDiscountName, setCustomDiscountName] = useState("Tomorrow's Sale");
  const [customDiscountType, setCustomDiscountType] = useState<'percent' | 'flat'>('percent');
  const [customDiscountValue, setCustomDiscountValue] = useState(10);

  // Category helpers
  const isAddonProduct = (p: Product) => Boolean(p.isCheckoutAddon);
  const isBlanketProduct = (p: Product) => !p.collection || p.collection === 'Blankets' || p.collection.toLowerCase().includes('blanket') || (p.category && p.category.toLowerCase().includes('blanket'));

  const swaddles = products.filter(p => !isAddonProduct(p) && !isBlanketProduct(p) && p.isLive !== false);
  const blankets = products.filter(p => !isAddonProduct(p) && isBlanketProduct(p) && p.isLive !== false);

  // Sort POS products: First Swaddles (not addon, not blanket), then Blankets (not addon, is blanket), then Add-ons (is addon)
  // Each group sorted alphabetically A-Z (top to bottom) by name
  const sortedProducts = [...products].sort((a, b) => {
    const aIsAddon = isAddonProduct(a);
    const bIsAddon = isAddonProduct(b);
    const aIsBlanket = isBlanketProduct(a);
    const bIsBlanket = isBlanketProduct(b);

    const aGroup = aIsAddon ? 2 : (aIsBlanket ? 1 : 0);
    const bGroup = bIsAddon ? 2 : (bIsBlanket ? 1 : 0);

    if (aGroup !== bGroup) {
      return aGroup - bGroup;
    }

    return a.name.localeCompare(b.name);
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

  const handleAddBundleToCart = () => {
    if (!selectedBundleType) return;
    
    const timestamp = Date.now();
    let item1Obj: Product | undefined;
    let item2Obj: Product | undefined;

    if (selectedBundleType === 'two_swaddles') {
      item1Obj = swaddles.find(p => p.id === bundleItem1);
      item2Obj = swaddles.find(p => p.id === bundleItem2);
      
      if (!item1Obj || !item2Obj) {
        alert('Please select both swaddles');
        return;
      }

      const cart1: CartItem = {
        ...item1Obj,
        id: `${bundleItem1}-bundle1-${timestamp}`,
        baseProductId: bundleItem1,
        name: `${item1Obj.name} (Bundle Swaddle 1)`,
        price: 120, // 240 split in half
        quantity: 1
      };
      
      const cart2: CartItem = {
        ...item2Obj,
        id: `${bundleItem2}-bundle2-${timestamp}`,
        baseProductId: bundleItem2,
        name: `${item2Obj.name} (Bundle Swaddle 2)`,
        price: 120,
        quantity: 1
      };

      setCart(prev => [...prev, cart1, cart2]);

    } else if (selectedBundleType === 'blanket_swaddle') {
      item1Obj = blankets.find(p => p.id === bundleItem1);
      item2Obj = swaddles.find(p => p.id === bundleItem2);
      
      if (!item1Obj || !item2Obj) {
        alert('Please select a blanket and a swaddle');
        return;
      }

      const cart1: CartItem = {
        ...item1Obj,
        id: `${bundleItem1}-baby-bundle-${timestamp}`,
        baseProductId: bundleItem1,
        name: `${item1Obj.name} (Baby Blanket - Bundle Item)`,
        price: 120, // RM 120 blanket + RM 80 swaddle = RM 200
        size: item1Obj.babySizeDesc || '70 cm x 100 cm',
        sizeOption: 'baby',
        quantity: 1
      };
      
      const cart2: CartItem = {
        ...item2Obj,
        id: `${bundleItem2}-bundle-${timestamp}`,
        baseProductId: bundleItem2,
        name: `${item2Obj.name} (Swaddle - Bundle Item)`,
        price: 80,
        quantity: 1
      };

      setCart(prev => [...prev, cart1, cart2]);

    } else if (selectedBundleType === 'adult_baby_blanket') {
      item1Obj = blankets.find(p => p.id === bundleItem1);
      item2Obj = blankets.find(p => p.id === bundleItem2);
      
      if (!item1Obj || !item2Obj) {
        alert('Please select both blankets');
        return;
      }

      const cart1: CartItem = {
        ...item1Obj,
        id: `${bundleItem1}-adult-bundle-${timestamp}`,
        baseProductId: bundleItem1,
        name: `${item1Obj.name} (Adult Blanket - Bundle Item)`,
        price: 110, // RM 110 adult + RM 80 baby = RM 190
        size: item1Obj.adultSizeDesc || '150 cm x 100 cm',
        sizeOption: 'adult',
        quantity: 1
      };
      
      const cart2: CartItem = {
        ...item2Obj,
        id: `${bundleItem2}-baby-bundle-${timestamp}`,
        baseProductId: bundleItem2,
        name: `${item2Obj.name} (Baby Blanket - Bundle Item)`,
        price: 80,
        size: item2Obj.babySizeDesc || '70 cm x 100 cm',
        sizeOption: 'baby',
        quantity: 1
      };

      setCart(prev => [...prev, cart1, cart2]);
    }

    setSelectedBundleType(null);
    setBundleItem1('');
    setBundleItem2('');
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
  const discountAmount = posDiscount 
    ? (posDiscount.type === 'percent' ? (subtotal * posDiscount.value / 100) : posDiscount.value)
    : 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleConfirmOrder = async () => {
    setIsProcessing(true);
    try {
      const discountNote = posDiscount 
        ? `[POS Discount Applied: ${posDiscount.label} (${posDiscount.type === 'percent' ? `${posDiscount.value}%` : `RM ${posDiscount.value}`} off - Saved RM ${discountAmount.toFixed(2)})]`
        : '';

      const orderData: Omit<Order, 'id'> = {
        customerName: customerInfo.name || 'POS Customer',
        customerEmail: customerInfo.email || 'pos@store.local',
        customerPhone: customerInfo.phone || '0000000000',
        items: cart,
        total,
        status: 'paid',
        date: new Date().toISOString(),
        shippingAddress: 'In-Store',
        source: 'pos',
        paymentMethod: paymentMethod,
        adminNotes: discountNote ? discountNote : undefined
      };
      await createOrderInDb(orderData);
      setView('success');
      setCart([]);
      setPosDiscount(null);
      setCustomerInfo({ name: '', phone: '', email: '' });
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
        <div className="p-6 border-b border-brand-latte/20 flex justify-between items-center bg-brand-grey/10">
          <button onClick={() => setView('checkout')} className="text-gray-500 hover:text-brand-flamingo flex items-center gap-2">
            <ChevronLeft size={20} /> Back to Cashier
          </button>
          <div className="font-serif text-2xl text-center flex-1">Customer Checkout</div>
          <div className="w-24"></div>
        </div>

        <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center text-center">
          <h3 className="font-sans font-bold text-gray-500 tracking-widest uppercase mb-4">Total Amount Due</h3>
          <div className="text-5xl font-script text-brand-flamingo mb-12">RM {total.toFixed(2)}</div>

          {paymentMethod === 'bank_transfer' ? (
            <div className="bg-brand-grey/10 p-8 rounded border border-brand-latte/30 w-full max-w-md">
              <CreditCard className="w-12 h-12 text-brand-gold mx-auto mb-4" />
              <h4 className="font-serif text-xl mb-6">Bank Transfer Details</h4>
              <div className="space-y-4 text-left">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bank Name</p>
                  <p className="text-lg font-mono">MAYBANK</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Account Name</p>
                  <p className="text-lg font-mono">Vanillicious Enterprise</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Account Number</p>
                  <p className="text-lg font-mono font-bold tracking-widest text-brand-flamingo">5621 8832 7902</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-brand-grey/10 p-8 rounded border border-brand-latte/30 w-full max-w-md flex flex-col items-center">
              <QrCode className="w-12 h-12 text-brand-gold mx-auto mb-4" />
              <h4 className="font-serif text-xl mb-6">Scan to Pay (DuitNow QR)</h4>
              <div className="w-64 h-64 bg-white border border-gray-200 flex items-center justify-center p-4">
                <img 
                  src="https://i.postimg.cc/q7S8hzvt/qr-jpeg.png" 
                  alt="DuitNow QR" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className="mt-12 w-full max-w-md">
            <button 
              onClick={handleConfirmOrder}
              disabled={isProcessing}
              className="w-full bg-brand-flamingo text-white py-4 font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Cashier: Confirm Payment Received'}
            </button>
            <p className="text-xs text-gray-400 mt-4 italic">Please hand the iPad back to the cashier to confirm the order.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'checkout') {
    return (
      <div className="bg-white min-h-[70vh] rounded shadow-sm border border-brand-latte/20 flex flex-col md:flex-row">
        {/* Order Summary */}
        <div className="flex-1 p-6 md:p-8 border-r border-brand-latte/20">
          <button onClick={() => setView('shop')} className="text-gray-500 hover:text-brand-flamingo flex items-center gap-2 mb-6">
            <ChevronLeft size={20} /> Back to POS Menu
          </button>
          
          <h2 className="font-serif text-2xl mb-6">Order Summary</h2>
          <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-4">
            {cart.map(item => {
              const isAddon = Boolean(item.isCheckoutAddon);
              const isBlanket = isBlanketProduct(item);
              const itemTag = isAddon ? 'Add-on' : (isBlanket ? 'Blanket' : 'Swaddle');
              return (
                <div key={item.id} className="flex justify-between items-center py-2 border-b border-brand-latte/10">
                  <div className="flex gap-4 items-center flex-1">
                    <div className="w-12 h-12 bg-gray-100 flex-shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-gray-900">{item.name}</p>
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
                      <p className="text-xs text-gray-500 font-mono mt-0.5">RM {item.price.toFixed(2)} x {item.quantity}</p>
                    </div>
                  </div>
                  <div className="font-bold font-mono">
                    RM {(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="border-t border-brand-latte/20 pt-6 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-gray-400 uppercase tracking-widest text-xs">Subtotal</span>
              <span className="font-mono text-gray-600">RM {subtotal.toFixed(2)}</span>
            </div>
            
            {posDiscount && (
              <div className="flex justify-between items-center text-sm text-brand-flamingo">
                <span className="font-bold uppercase tracking-widest text-xs">🏷️ Discount ({posDiscount.label})</span>
                <span className="font-mono">- RM {discountAmount.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center border-t border-brand-latte/10 pt-4 mt-2">
              <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Total Due</span>
              <span className="font-script text-3xl text-brand-flamingo">RM {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Checkout Controls */}
        <div className="flex-1 p-6 md:p-8 bg-brand-grey/5">
          <h2 className="font-serif text-2xl mb-6">Checkout Details</h2>
          
          <div className="mb-8">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer Info (Optional)</label>
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
            onClick={() => setView('customer_payment')}
            className="w-full bg-gray-900 text-white py-4 font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-flamingo transition-colors"
          >
            Pass iPad to Customer <ChevronLeft size={16} className="rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  // SHOP VIEW (iPad layout optimized)
  return (
    <div className="flex flex-col md:flex-row gap-6 h-[85vh]">
      {/* Products Grid Column */}
      <div className="flex-[2] bg-white border border-brand-latte/20 rounded shadow-sm overflow-y-auto p-6">
        
        {/* SECTION 2: SPECIAL LAUNCH BUNDLES (Framed with organic hand-drawn borders) */}
        <div 
          className="border-2 border-dashed border-brand-gold/50 bg-[#fffdf9] p-5 mb-8 relative hover:border-brand-flamingo/40 transition-colors"
          style={{ 
            borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
            boxShadow: '2px 8px 12px -4px rgba(220,175,106,0.08)'
          }}
        >
          <div className="absolute top-2.5 right-4 text-[9px] font-sans font-bold uppercase tracking-widest bg-brand-gold text-white px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles size={8} /> SPECIAL PROMO
          </div>
          
          <h3 className="font-serif text-lg text-gray-900 mb-4 flex items-center gap-2 tracking-wide font-medium">
            ✨ SPECIAL LAUNCH BUNDLES
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bundle Option 1 */}
            <div className="bg-white border border-brand-latte/20 p-4 rounded-[3px] hover:border-brand-gold transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-serif text-sm font-bold text-gray-900 leading-tight">Two Swaddles</h4>
                  <span className="text-[8px] font-sans font-bold bg-green-50 text-green-600 border border-green-100 px-1 py-0.5 rounded uppercase">Save RM 24</span>
                </div>
                <p className="text-[10px] text-gray-500 font-sans mt-2 leading-relaxed">Choose any two signature organic cotton swaddle designs.</p>
              </div>
              <div className="flex justify-between items-center mt-5 pt-2 border-t border-brand-latte/10">
                <div className="font-mono font-bold text-brand-flamingo text-sm">RM 240</div>
                <button 
                  onClick={() => {
                    setSelectedBundleType('two_swaddles');
                    setBundleItem1(swaddles[0]?.id || '');
                    setBundleItem2(swaddles[1]?.id || swaddles[0]?.id || '');
                  }}
                  className="bg-brand-flamingo/10 text-brand-flamingo hover:bg-brand-flamingo hover:text-white px-3 py-1.5 rounded-[2px] text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Bundle Option 2 */}
            <div className="bg-white border border-brand-latte/20 p-4 rounded-[3px] hover:border-brand-gold transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-serif text-sm font-bold text-gray-900 leading-tight">Baby Blanket & Swaddle</h4>
                  <span className="text-[8px] font-sans font-bold bg-green-50 text-green-600 border border-green-100 px-1 py-0.5 rounded uppercase">Save RM 32</span>
                </div>
                <p className="text-[10px] text-gray-500 font-sans mt-2 leading-relaxed">Combine one magical baby blanket with one bamboo swaddle.</p>
              </div>
              <div className="flex justify-between items-center mt-5 pt-2 border-t border-brand-latte/10">
                <div className="font-mono font-bold text-brand-flamingo text-sm">RM 200</div>
                <button 
                  onClick={() => {
                    setSelectedBundleType('blanket_swaddle');
                    setBundleItem1(blankets[0]?.id || '');
                    setBundleItem2(swaddles[0]?.id || '');
                  }}
                  className="bg-brand-flamingo/10 text-brand-flamingo hover:bg-brand-flamingo hover:text-white px-3 py-1.5 rounded-[2px] text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Bundle Option 3 */}
            <div className="bg-white border border-brand-latte/20 p-4 rounded-[3px] hover:border-brand-gold transition-all flex flex-col justify-between h-full group">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-serif text-sm font-bold text-gray-900 leading-tight">Adult & Baby Blanket</h4>
                  <span className="text-[8px] font-sans font-bold bg-green-50 text-green-600 border border-green-100 px-1 py-0.5 rounded uppercase">Save RM 6</span>
                </div>
                <p className="text-[10px] text-gray-500 font-sans mt-2 leading-relaxed">Select one luxurious Adult blanket and one Baby blanket size.</p>
              </div>
              <div className="flex justify-between items-center mt-5 pt-2 border-t border-brand-latte/10">
                <div className="font-mono font-bold text-brand-flamingo text-sm">RM 190</div>
                <button 
                  onClick={() => {
                    setSelectedBundleType('adult_baby_blanket');
                    setBundleItem1(blankets[0]?.id || '');
                    setBundleItem2(blankets[1]?.id || blankets[0]?.id || '');
                  }}
                  className="bg-brand-flamingo/10 text-brand-flamingo hover:bg-brand-flamingo hover:text-white px-3 py-1.5 rounded-[2px] text-[9px] font-bold uppercase tracking-wider transition-all"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: STANDARD PRODUCTS MENU */}
        <h2 className="font-serif text-2xl mb-6 text-gray-900 tracking-wide font-medium">POS Menu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedProducts.map(product => {
            const isAddon = isAddonProduct(product);
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
          {products.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-400 italic">No products available.</div>
          )}
        </div>
      </div>

      {/* Cart Sidebar Column */}
      <div className="flex-1 bg-white border border-brand-latte/20 rounded shadow-sm flex flex-col max-w-sm w-full">
        <div className="p-4 border-b border-brand-latte/20 bg-brand-grey/5">
          <h2 className="font-serif text-xl font-medium text-gray-900 tracking-wide">Current Order</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 italic text-sm mt-12">Cart is empty. Tap products to add.</div>
          ) : (
            cart.map(item => {
              const isAddon = isAddonProduct(item);
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
                    <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="font-mono text-xs font-bold text-brand-flamingo">RM {(item.price * item.quantity).toFixed(2)}</div>
                    <div className="flex items-center gap-2.5 bg-white border border-brand-latte/20 rounded-full px-2 py-0.5">
                      <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-500 p-0.5 hover:text-brand-flamingo cursor-pointer"><Minus size={10} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-500 p-0.5 hover:text-brand-flamingo cursor-pointer"><Plus size={10} /></button>
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

            {posDiscount && (
              <div className="flex justify-between items-center text-brand-flamingo text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase bg-brand-flamingo/10 px-1.5 py-0.5 rounded tracking-wider">🏷️ {posDiscount.label}</span>
                  <button 
                    onClick={() => setPosDiscount(null)}
                    className="text-[10px] text-red-500 hover:underline font-bold uppercase tracking-wider cursor-pointer"
                  >
                    [Delete]
                  </button>
                </div>
                <span className="font-mono font-bold">- RM {discountAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Total Due</span>
            <span className="font-script text-2xl text-brand-flamingo">RM {total.toFixed(2)}</span>
          </div>

          {/* Discount Trigger Button */}
          {!posDiscount && (
            <button 
              onClick={() => setShowDiscountModal(true)}
              className="w-full mb-3 bg-white border border-brand-flamingo/30 text-brand-flamingo py-2 font-bold uppercase tracking-widest text-[10px] rounded hover:bg-brand-flamingo/5 transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <Percent size={10} /> Apply Custom/Promo Discount
            </button>
          )}

          <button 
            onClick={() => setView('checkout')}
            disabled={cart.length === 0}
            className="w-full bg-brand-flamingo text-white py-3 font-bold uppercase tracking-widest text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-flamingo/90 transition-colors cursor-pointer"
          >
            Proceed to Payment
          </button>
        </div>
      </div>

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

      {/* --- POPUP MODAL 2: SPECIAL LAUNCH BUNDLE CONFIGURATOR --- */}
      {selectedBundleType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded max-w-lg w-full p-6 border border-brand-latte/30 shadow-xl relative">
            <button 
              onClick={() => setSelectedBundleType(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <h3 className="font-serif text-xl text-gray-900 mb-1 font-medium">Configure Promotional Bundle</h3>
            <span className="text-xs font-sans font-bold bg-brand-gold/10 text-brand-gold px-2.5 py-0.5 rounded uppercase tracking-wider inline-block mb-6">
              {selectedBundleType === 'two_swaddles' && 'Two Swaddles Promo — RM 240 (Save RM 24)'}
              {selectedBundleType === 'blanket_swaddle' && 'Baby Blanket & Swaddle Promo — RM 200 (Save RM 32)'}
              {selectedBundleType === 'adult_baby_blanket' && 'Adult Blanket & Baby Blanket Promo — RM 190 (Save RM 6)'}
            </span>
            
            <div className="space-y-4 mb-8">
              {/* SELECTION ITEM 1 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {selectedBundleType === 'two_swaddles' && 'Select Swaddle 1'}
                  {selectedBundleType === 'blanket_swaddle' && 'Select Baby Blanket'}
                  {selectedBundleType === 'adult_baby_blanket' && 'Select Adult Blanket'}
                </label>
                <select 
                  className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white font-serif"
                  value={bundleItem1}
                  onChange={e => setBundleItem1(e.target.value)}
                >
                  <option value="">-- Choose Design --</option>
                  {selectedBundleType === 'two_swaddles' && swaddles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (In stock: {p.stock || 0})</option>
                  ))}
                  {(selectedBundleType === 'blanket_swaddle' || selectedBundleType === 'adult_baby_blanket') && blankets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (In stock: {p.stock || 0})</option>
                  ))}
                </select>
              </div>

              {/* SELECTION ITEM 2 */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {selectedBundleType === 'two_swaddles' && 'Select Swaddle 2'}
                  {selectedBundleType === 'blanket_swaddle' && 'Select Swaddle'}
                  {selectedBundleType === 'adult_baby_blanket' && 'Select Baby Blanket'}
                </label>
                <select 
                  className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-white font-serif"
                  value={bundleItem2}
                  onChange={e => setBundleItem2(e.target.value)}
                >
                  <option value="">-- Choose Design --</option>
                  {selectedBundleType === 'two_swaddles' && swaddles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (In stock: {p.stock || 0})</option>
                  ))}
                  {selectedBundleType === 'blanket_swaddle' && swaddles.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (In stock: {p.stock || 0})</option>
                  ))}
                  {selectedBundleType === 'adult_baby_blanket' && blankets.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (In stock: {p.stock || 0})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setSelectedBundleType(null)}
                className="border border-brand-latte/30 px-4 py-2.5 rounded text-xs uppercase font-bold tracking-wider text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddBundleToCart}
                disabled={!bundleItem1 || !bundleItem2}
                className="bg-brand-flamingo text-white px-5 py-2.5 rounded text-xs uppercase font-bold tracking-wider disabled:opacity-50 cursor-pointer"
              >
                Add Bundle to Order
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

