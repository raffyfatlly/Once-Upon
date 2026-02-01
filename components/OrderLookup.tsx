
import React, { useState } from 'react';
import { getCustomerOrders } from '../firebase';
import { Order } from '../types';
import { Search, Loader2, Package, Calendar, AlertCircle, ShoppingBag, ArrowRight, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OrderLookup: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  // Normalize phone for comparison (remove spaces, dashes, etc)
  const normalizePhone = (p: string) => p.replace(/\D/g, '');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !phone) {
      setError('Please provide both email and phone number for verification.');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(false);
    setOrders([]);

    try {
      // 1. Query by Email (Public Index)
      const results = await getCustomerOrders(email);
      
      // 2. Client-side Security Filter by Phone
      // This ensures even if someone guesses an email, they can't see orders without the phone number.
      const searchPhoneNorm = normalizePhone(phone);
      
      const verifiedOrders = results.filter(order => {
        if (!order.customerPhone) return false;
        // Check if the order's phone contains the search phone or vice versa to be lenient with country codes
        const orderPhoneNorm = normalizePhone(order.customerPhone);
        return orderPhoneNorm.includes(searchPhoneNorm) || searchPhoneNorm.includes(orderPhoneNorm);
      });

      setOrders(verifiedOrders);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      setError('We could not retrieve your orders at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'paid': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'shipped': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'delivered': return 'bg-brand-green/10 text-brand-green border-brand-green/20';
      case 'cancelled': return 'bg-gray-50 text-gray-500 border-gray-200';
      case 'failed': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-yellow-50 text-yellow-700 border-yellow-100';
    }
  };

  return (
    <div className="min-h-screen bg-white animate-fade-in pt-24 pb-20">
      <div className="container mx-auto px-6 max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="font-script text-3xl text-brand-gold mb-2 block">Concierge</span>
          <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-6">Track Your Order</h1>
          <p className="font-sans text-gray-500 font-light max-w-md mx-auto text-sm leading-relaxed">
            Please enter the email address and phone number associated with your purchase to view your history.
          </p>
        </div>

        {/* Search Form */}
        <div className="max-w-md mx-auto bg-brand-grey/5 p-8 border border-brand-latte/20 rounded-[2px] mb-16 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col gap-6">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@example.com"
                className="w-full bg-white border border-brand-latte/30 px-4 py-3 font-sans text-gray-800 focus:outline-none focus:border-brand-flamingo focus:ring-1 focus:ring-brand-flamingo/20 transition-all placeholder:text-gray-300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Phone Number</label>
              <input 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+60..."
                className="w-full bg-white border border-brand-latte/30 px-4 py-3 font-sans text-gray-800 focus:outline-none focus:border-brand-flamingo focus:ring-1 focus:ring-brand-flamingo/20 transition-all placeholder:text-gray-300"
              />
            </div>
            
            {error && (
              <div className="flex items-start gap-2 text-red-500 text-xs bg-red-50 p-3 border border-red-100">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="mt-2 bg-brand-flamingo text-white h-12 flex items-center justify-center gap-2 hover:bg-brand-gold transition-colors font-sans text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg shadow-brand-flamingo/20 disabled:opacity-70"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={14} />}
              Find Orders
            </button>
          </form>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-4 mb-8">
               <div className="h-[1px] flex-1 bg-brand-latte/20"></div>
               <span className="font-serif text-xl text-gray-900">Your History</span>
               <div className="h-[1px] flex-1 bg-brand-latte/20"></div>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-brand-latte/30 rounded-[2px]">
                <Package size={32} className="mx-auto text-brand-latte mb-3 opacity-50" />
                <p className="text-gray-500 font-sans text-sm">No orders found matching these details.</p>
                <button onClick={() => navigate('/')} className="mt-4 text-xs font-bold text-brand-flamingo uppercase tracking-widest hover:text-brand-gold">
                  Return to Shop
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white border border-brand-latte/20 p-6 md:p-8 rounded-[2px] shadow-sm hover:shadow-md transition-shadow group">
                    {/* Order Header */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 border-b border-brand-latte/10 pb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-sm text-gray-400">#{order.id.slice(-8).toUpperCase()}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar size={12} />
                          {new Date(order.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-serif text-xl text-gray-900">RM {order.total}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest">Total Paid</span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="flex flex-col gap-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-center">
                          <div className="w-12 h-16 bg-brand-grey/10 overflow-hidden rounded-[2px] border border-brand-latte/10">
                             <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-serif text-gray-900 text-sm">{item.name}</h4>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-sm font-bold text-gray-900">RM {item.price}</div>
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 pt-6 border-t border-brand-latte/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Truck size={14} />
                        <span className="truncate max-w-xs">{order.shippingAddress}</span>
                      </div>
                      
                      {/* Only show 'Buy Again' if not cancelled/failed */}
                      {order.status !== 'cancelled' && order.status !== 'failed' && (
                         <button 
                           onClick={() => navigate(`/product/${order.items[0].id}`)}
                           className="text-brand-flamingo text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                         >
                           View Item <ArrowRight size={12} />
                         </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
