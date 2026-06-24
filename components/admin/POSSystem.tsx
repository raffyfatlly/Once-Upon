import React, { useState } from 'react';
import { Product, CartItem, Order } from '../../types';
import { createOrderInDb } from '../../firebase';
import { Plus, Minus, Trash2, CreditCard, QrCode, CheckCircle, ChevronLeft } from 'lucide-react';

interface POSSystemProps {
  products: Product[];
}

export const POSSystem: React.FC<POSSystemProps> = ({ products }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<'shop' | 'checkout' | 'customer_payment' | 'success'>('shop');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'qr'>('bank_transfer');
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', email: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleConfirmOrder = async () => {
    setIsProcessing(true);
    try {
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
        paymentMethod: paymentMethod
      };
      await createOrderInDb(orderData);
      setView('success');
      setCart([]);
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
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-brand-latte/10">
                <div className="flex gap-4 items-center flex-1">
                  <div className="w-12 h-12 bg-gray-100 flex-shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</p>
                    <p className="text-xs text-gray-500 font-mono">RM {item.price.toFixed(2)} x {item.quantity}</p>
                  </div>
                </div>
                <div className="font-bold font-mono">
                  RM {(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-between items-center border-t border-brand-latte/20 pt-6">
            <span className="font-bold text-gray-500 uppercase tracking-widest text-sm">Total</span>
            <span className="font-script text-3xl text-brand-flamingo">RM {total.toFixed(2)}</span>
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
    <div className="flex flex-col md:flex-row gap-6 h-[80vh]">
      {/* Products Grid */}
      <div className="flex-[2] bg-white border border-brand-latte/20 rounded shadow-sm overflow-y-auto p-6">
        <h2 className="font-serif text-2xl mb-6 text-gray-900">POS Menu</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(product => (
            <button 
              key={product.id} 
              onClick={() => handleAddToCart(product)}
              className="text-left group border border-brand-latte/20 rounded overflow-hidden hover:border-brand-flamingo transition-colors flex flex-col h-full bg-gray-50"
            >
              <div className="aspect-[4/3] bg-gray-200 relative overflow-hidden">
                <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {product.isPosOnly && (
                  <span className="absolute top-2 left-2 bg-black text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest rounded-sm z-10">POS ONLY</span>
                )}
              </div>
              <div className="p-3 flex flex-col flex-grow justify-between">
                <h3 className="font-bold text-xs text-gray-900 line-clamp-2 leading-tight mb-2">{product.name}</h3>
                <div className="font-mono text-brand-flamingo text-sm">RM {product.price}</div>
              </div>
            </button>
          ))}
          {products.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-400 italic">No products available.</div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="flex-1 bg-white border border-brand-latte/20 rounded shadow-sm flex flex-col max-w-sm w-full">
        <div className="p-4 border-b border-brand-latte/20 bg-brand-grey/5">
          <h2 className="font-serif text-xl">Current Order</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-400 italic text-sm mt-12">Cart is empty. Tap products to add.</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex flex-col gap-2 p-3 border border-brand-latte/20 rounded bg-gray-50">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-xs text-gray-900 leading-tight pr-4">{item.name}</span>
                  <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="font-mono text-sm text-brand-flamingo">RM {(item.price * item.quantity).toFixed(2)}</div>
                  <div className="flex items-center gap-3 bg-white border border-brand-latte/20 rounded-full px-2 py-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-500 p-1"><Minus size={12} /></button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-500 p-1"><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-brand-latte/20 bg-brand-grey/5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500 uppercase tracking-widest text-[10px] font-bold">Total Due</span>
            <span className="font-script text-2xl text-brand-flamingo">RM {total.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setView('checkout')}
            disabled={cart.length === 0}
            className="w-full bg-brand-flamingo text-white py-3 font-bold uppercase tracking-widest text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-flamingo/90 transition-colors"
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
};
