
import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { Search, User, Package, Calendar, Loader2, Check, Filter, ClipboardCopy, Clock, Mail, MapPin, ChevronDown, ChevronUp, Gift, Phone, Trash2, Printer, CheckSquare, Square, TrendingUp, BarChart3, Hash, CreditCard, Tag, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { updateOrderAndRestock, deleteOrderFromDb, autoReleaseStaleOrders } from '../../firebase';

interface SalesManagerProps {
  orders: Order[];
}

export const SalesManager: React.FC<SalesManagerProps> = ({ orders }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleteOrderConfirmation, setDeleteOrderConfirmation] = useState<string | null>(null);

  // Auto-cleanup state
  const [lastCleanup, setLastCleanup] = useState<Date>(new Date());
  const [cleanupMessage, setCleanupMessage] = useState<string>('');

  const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'failed', 'cancelled'];

  // Extract unique product names from all orders
  const uniqueProducts = Array.from(new Set(orders.flatMap(o => o.items.map(i => i.name)))).sort();

  // --- AUTOMATED STALE ORDER CLEANUP ---
  // Runs on mount and every 60 seconds
  useEffect(() => {
    const runCleanup = async () => {
      try {
        const releasedCount = await autoReleaseStaleOrders(5); // 5 minutes timeout
        setLastCleanup(new Date());
        if (releasedCount > 0) {
            setCleanupMessage(`Released stock for ${releasedCount} stale order(s).`);
            setTimeout(() => setCleanupMessage(''), 5000);
        }
      } catch (e) {
        console.error("Auto-cleanup failed", e);
      }
    };

    // Run immediately
    runCleanup();

    // Run interval
    const interval = setInterval(runCleanup, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, filterProduct, startDate, endDate]);

  const setQuickDate = (range: 'today' | 'week' | 'month' | 'clear') => {
    if (range === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const end = new Date();
    const start = new Date();
    if (range === 'today') {
    } else if (range === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (range === 'month') {
      start.setDate(end.getDate() - 30);
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string, currentStatus: string) => {
    // If Admin selects Cancelled or Failed, warn them about stock return
    if ((newStatus === 'cancelled' || newStatus === 'failed') && (currentStatus !== 'cancelled' && currentStatus !== 'failed')) {
        const confirm = window.confirm(`Setting this order to '${newStatus}' will AUTOMATICALLY RESTORE STOCK for these items.\n\nAre you sure you want to release the stock back to the store?`);
        if (!confirm) return;
    }

    try {
      await updateOrderAndRestock(orderId, newStatus, currentStatus);
    } catch (error: any) {
      alert("Failed to update status: " + error.message);
    }
  };

  const handleOrderDeleteClick = (id: string) => {
    if (deleteOrderConfirmation === id) {
      handleOrderDelete(id);
    } else {
      setDeleteOrderConfirmation(id);
      setTimeout(() => {
        setDeleteOrderConfirmation(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  const handleOrderDelete = async (id: string) => {
    setDeletingOrderId(id);
    setDeleteOrderConfirmation(null);
    try {
      await deleteOrderFromDb(id);
    } catch (error: any) {
      console.error("Delete Order Error:", error);
      alert("Failed to delete order.");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handlePrintOrder = (order: Order) => {
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Packing Slip #${order.id}</title>
         <link href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;600;700&family=Pinyon+Script&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 0; }
          body { font-family: 'Playfair Display', serif; color: #1a1a1a; margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact; }
          .container { padding: 40px 50px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #D9C4B8; }
          .brand-name { font-size: 32px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 5px; color: #1a1a1a; }
          .brand-subtitle { font-family: 'Pinyon Script', cursive; font-size: 24px; color: #C5A992; margin-top: 0; }
          .order-meta { display: flex; justify-content: space-between; margin-bottom: 40px; font-family: 'Lato', sans-serif; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; }
          
          .address-section { margin-bottom: 40px; }
          .address-title { font-family: 'Lato', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; width: 100%; }
          .address-content { font-size: 14px; line-height: 1.6; color: #333; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          th { text-align: left; font-family: 'Lato', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #999; padding: 10px 0; border-bottom: 1px solid #eee; }
          td { padding: 15px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; }
          .item-name { font-weight: 600; color: #1a1a1a; }
          .item-meta { font-size: 12px; color: #666; font-style: italic; }
          .qty-col { width: 60px; text-align: right; }
          
          .footer { text-align: center; margin-top: 60px; padding-top: 30px; border-top: 1px solid #f5f5f5; }
          .thank-you { font-family: 'Pinyon Script', cursive; font-size: 32px; color: #D9C4B8; margin-bottom: 10px; }
          .footer-text { font-family: 'Lato', sans-serif; font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: #999; }
          
          .gift-message { background: #faf8f6; padding: 20px; border: 1px dashed #D9C4B8; margin-bottom: 30px; text-align: center; }
          .gift-title { font-family: 'Lato', sans-serif; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #C5A992; margin-bottom: 10px; }
          .gift-text { font-family: 'Playfair Display', serif; font-style: italic; font-size: 16px; color: #555; }
        </style>
      </head>
      <body>
      <div class="container">
        <div class="header">
          <div class="brand-name">Once Upon</div>
          <div class="brand-subtitle">Kuala Lumpur</div>
        </div>
        
        <div class="order-meta">
          <div>Order #${order.id}</div>
          <div>${new Date(order.date).toLocaleDateString()}</div>
        </div>
        
        <div class="address-section">
          <div class="address-title">Ship To</div>
          <div class="address-content">
            <strong>${order.customerName}</strong><br>
            ${order.shippingAddress}<br>
            Phone: ${order.customerPhone}<br>
            Email: ${order.customerEmail}
          </div>
        </div>
        
        ${order.isGift ? `
        <div class="gift-message">
          <div class="gift-title">A Gift For You</div>
          <div class="gift-text">
             To: ${order.giftTo || 'You'}<br>
             From: ${order.giftFrom || 'Someone Special'}
          </div>
        </div>
        ` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="qty-col">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td>
                  <div class="item-name">${item.name}</div>
                  <div class="item-meta">${item.collection || 'Blankets'}</div>
                </td>
                <td class="qty-col">${item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <div class="thank-you">Designed with Love</div>
          <div class="footer-text">www.onceuponmy.com</div>
        </div>
      </div>
      <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const toggleOrderSelection = (id: string) => {
    const newSet = new Set(selectedOrders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrders(newSet);
  };
  
  const filteredOrders = orders.filter(order => {
     const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.includes(searchQuery) ||
      (order.customerPhone && order.customerPhone.includes(searchQuery));
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesProduct = filterProduct === 'all' || order.items.some(item => item.name === filterProduct);

    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = new Date(order.date);
      if (startDate) matchesDate = matchesDate && orderDate >= new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= end;
      }
    }
    return matchesSearch && matchesStatus && matchesDate && matchesProduct;
  });

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };
  
  const handleBulkCopy = async () => {
    const ordersToCopy = orders.filter(o => selectedOrders.has(o.id));
    
    if (ordersToCopy.length === 0) return;

    const textToCopy = ordersToCopy.map(order => {
      const itemsList = order.items
        .map(item => `${item.quantity} x ${item.name} (${item.collection || 'Blankets'})`)
        .join('\n');
      
      let entry = `ORDER #${order.id}\n${itemsList}`;
      
      if (order.isGift) {
        entry += `\n\n[GIFT MESSAGE]\nTo: ${order.giftTo || ''}\nFrom: ${order.giftFrom || ''}`;
      }
      
      return entry;
    }).join('\n\n----------------------------------------\n\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      alert(`${ordersToCopy.length} Order(s) copied to clipboard!`);
    } catch (err) {
      console.error("Copy failed", err);
      alert("Failed to copy to clipboard.");
    }
  };

  // Helper to identify old pending orders
  const isStalePending = (order: Order) => {
    if (order.status !== 'pending') return false;
    const orderTime = new Date(order.date).getTime();
    const now = new Date().getTime();
    // Consider stale if older than 5 minutes
    return (now - orderTime) > (5 * 60 * 1000); 
  };

  // --- ANALYTICS CALCULATION ---
  // Only consider 'paid', 'shipped', 'delivered' as valid sales for revenue calculation
  const analytics = filteredOrders.reduce((acc, order) => {
    const isSale = ['paid', 'shipped', 'delivered'].includes(order.status);
    
    if (isSale) {
      acc.totalRevenue += order.total;
      acc.totalItems += order.items.reduce((sum, item) => sum + item.quantity, 0);
      acc.successfulOrders += 1;
    }
    
    acc.totalOrders += 1; // Tracks visible rows regardless of status
    return acc;
  }, { totalRevenue: 0, totalOrders: 0, totalItems: 0, successfulOrders: 0 });

  const averageOrderValue = analytics.successfulOrders > 0 
    ? analytics.totalRevenue / analytics.successfulOrders 
    : 0;

  // --- PAGINATION CALCULATION ---
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
            <h2 className="font-serif text-2xl md:text-3xl text-gray-900">Sales & Customers</h2>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Manage orders and check status</p>
                <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
                <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-100 animate-pulse">
                    <RefreshCw size={10} className="animate-spin-slow" /> Auto-Monitor Active
                </div>
            </div>
            {cleanupMessage && <p className="text-[10px] text-brand-flamingo font-bold mt-1 animate-fade-in">{cleanupMessage}</p>}
        </div>
        <div className="flex flex-col w-full md:w-auto gap-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white border border-brand-latte/20 p-2 rounded-[2px]">
            <div className="flex gap-2 items-center px-2 text-gray-400"><Clock size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">Date Range</span></div>
            <div className="flex gap-1">
                <button onClick={() => setQuickDate('today')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand-grey/10 hover:bg-brand-flamingo hover:text-white rounded-[2px] transition-colors">Today</button>
                <button onClick={() => setQuickDate('week')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand-grey/10 hover:bg-brand-flamingo hover:text-white rounded-[2px] transition-colors">7 Days</button>
                <button onClick={() => setQuickDate('month')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand-grey/10 hover:bg-brand-flamingo hover:text-white rounded-[2px] transition-colors">30 Days</button>
                {(startDate || endDate) && (<button onClick={() => setQuickDate('clear')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-[2px] transition-colors">Clear</button>)}
            </div>
            <div className="h-6 w-[1px] bg-brand-latte/20 hidden sm:block"></div>
            <div className="flex gap-2 items-center flex-1 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto group">
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-latte group-hover:text-brand-flamingo transition-colors"><Calendar size={14} /></div>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} onClick={(e) => (e.currentTarget as any).showPicker()} className="pl-3 pr-8 py-1.5 bg-brand-grey/5 hover:bg-white border border-transparent hover:border-brand-latte/30 rounded-[2px] text-[10px] font-bold uppercase tracking-widest text-gray-600 focus:outline-none focus:border-brand-flamingo w-full sm:w-auto cursor-pointer transition-all [&::-webkit-calendar-picker-indicator]:hidden" />
                </div>
                <span className="text-gray-300">-</span>
                <div className="relative w-full sm:w-auto group">
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-latte group-hover:text-brand-flamingo transition-colors"><Calendar size={14} /></div>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} onClick={(e) => (e.currentTarget as any).showPicker()} className="pl-3 pr-8 py-1.5 bg-brand-grey/5 hover:bg-white border border-transparent hover:border-brand-latte/30 rounded-[2px] text-[10px] font-bold uppercase tracking-widest text-gray-600 focus:outline-none focus:border-brand-flamingo w-full sm:w-auto cursor-pointer transition-all [&::-webkit-calendar-picker-indicator]:hidden" />
                </div>
            </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none bg-white border border-brand-latte/30 px-4 py-3 pr-10 rounded-[2px] text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo text-gray-600 w-full md:w-32">
                    <option value="all">All Status</option>
                    {ORDER_STATUSES.map(status => (<option key={status} value={status}>{status}</option>))}
                </select>
                <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="appearance-none bg-white border border-brand-latte/30 px-4 py-3 pr-10 rounded-[2px] text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo text-gray-600 w-full md:w-32 truncate">
                    <option value="all">All Products</option>
                    {uniqueProducts.map(p => (<option key={p} value={p}>{p}</option>))}
                </select>
                <Tag size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                <input type="text" placeholder="Search order #, name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-brand-latte/30 focus:border-brand-flamingo outline-none text-sm rounded-[2px] shadow-sm" />
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>
        </div>
        </div>

        {/* --- ANALYTICS CARDS --- */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           <div className="bg-white p-5 border border-brand-latte/20 rounded-[2px] shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10 text-brand-flamingo"><CreditCard size={48} /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Total Sales</p>
              <h3 className="font-serif text-2xl text-gray-900">RM {analytics.totalRevenue.toLocaleString()}</h3>
           </div>
           
           <div className="bg-white p-5 border border-brand-latte/20 rounded-[2px] shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10 text-brand-gold"><Hash size={48} /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Orders Count</p>
              <h3 className="font-serif text-2xl text-gray-900">{analytics.totalOrders}</h3>
           </div>

           <div className="bg-white p-5 border border-brand-latte/20 rounded-[2px] shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10 text-brand-green"><Package size={48} /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Items Sold</p>
              <h3 className="font-serif text-2xl text-gray-900">{analytics.totalItems}</h3>
           </div>

           <div className="bg-white p-5 border border-brand-latte/20 rounded-[2px] shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 p-4 opacity-10 text-blue-400"><TrendingUp size={48} /></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Avg. Order Value</p>
              <h3 className="font-serif text-2xl text-gray-900">RM {averageOrderValue.toFixed(2)}</h3>
           </div>
        </div>

        {selectedOrders.size > 0 && (
        <div className="bg-brand-flamingo/5 border border-brand-flamingo/20 p-3 rounded-[2px] mb-4 flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-flamingo px-2">{selectedOrders.size} Selected</span>
            <button onClick={handleBulkCopy} className="bg-white border border-brand-flamingo/20 text-brand-flamingo px-4 py-2 rounded-[2px] text-[10px] font-bold uppercase tracking-widest hover:bg-brand-flamingo hover:text-white transition-colors flex items-center gap-2">
            <ClipboardCopy size={14} /> Copy Details
            </button>
        </div>
        )}
        {filteredOrders.length === 0 ? (
        <div className="text-center py-24 bg-white border border-dashed border-brand-latte/30 rounded-[2px]">
            <Package size={32} className="mx-auto text-brand-latte mb-3 opacity-50" />
            <p className="text-gray-400 text-sm">No orders found matching filters.</p>
            {(searchQuery || filterStatus !== 'all' || filterProduct !== 'all' || startDate || endDate) && (<button onClick={() => {setSearchQuery(''); setFilterStatus('all'); setFilterProduct('all'); setStartDate(''); setEndDate('');}} className="text-brand-flamingo text-xs font-bold uppercase mt-2 hover:underline">Clear Filters</button>)}
        </div>
        ) : (
        <div className="bg-white border border-brand-latte/20 rounded-[2px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                <tr className="bg-brand-grey/10 border-b border-brand-latte/20">
                    <th className="p-4 w-12"><button onClick={toggleSelectAll} className="text-gray-400 hover:text-brand-flamingo">{selectedOrders.size > 0 && selectedOrders.size === filteredOrders.length ? (<CheckSquare size={16} className="text-brand-flamingo" />) : (<Square size={16} />)}</button></th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Order ID / Date</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Customer</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Items</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-24 text-center">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-brand-latte/10">
                {paginatedOrders.map(order => (
                    <React.Fragment key={order.id}>
                    <tr 
                        className={`transition-colors cursor-pointer group ${
                        expandedOrderId === order.id ? 'bg-brand-grey/10' : selectedOrders.has(order.id) ? 'bg-brand-flamingo/5' : 'hover:bg-brand-grey/5'
                        }`}
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    >
                        <td className="p-4" onClick={(e) => e.stopPropagation()}><button onClick={() => toggleOrderSelection(order.id)} className="text-gray-400 hover:text-brand-flamingo">{selectedOrders.has(order.id) ? (<CheckSquare size={16} className="text-brand-flamingo" />) : (<Square size={16} />)}</button></td>
                        <td className="p-4">
                            <div className="font-mono text-xs text-gray-400" title={order.id}>{order.id.length > 8 ? `#${order.id.substring(0,6)}...` : `#${order.id}`}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1"><Calendar size={10} /> {new Date(order.date).toLocaleDateString()}</div>
                            {/* Stale Warning for Pending > 5 mins */}
                            {isStalePending(order) && (
                                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase text-red-500 animate-pulse bg-red-50 px-1.5 py-0.5 rounded w-fit border border-red-100">
                                    <Clock size={10} /> Stuck?
                                </div>
                            )}
                        </td>
                        <td className="p-4"><div className="flex items-start gap-2"><div className="bg-brand-latte/20 p-1.5 rounded-full mt-0.5"><User size={12} className="text-brand-latte" /></div><div><div className="font-serif text-gray-900">{order.customerName}</div><div className="text-xs text-gray-400">{order.customerEmail}</div>{order.customerPhone && (<div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone size={10} /> {order.customerPhone}</div>)}</div></div></td>
                        <td className="p-4"><div className="text-xs text-gray-600">{order.items.map(i => (<div key={i.id} className="mb-1">{i.quantity}x {i.name}</div>))}</div></td>
                        <td className="p-4 font-bold text-sm text-gray-900">RM {order.total}</td>
                        <td className="p-4" onClick={(e) => e.stopPropagation()}><div className="relative inline-block"><select value={order.status} onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.status)} className={`appearance-none pl-3 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-flamingo ${ order.status === 'delivered' ? 'bg-green-50 border-green-200 text-green-700' : order.status === 'shipped' ? 'bg-blue-50 border-blue-200 text-blue-700' : order.status === 'paid' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : order.status === 'failed' ? 'bg-red-50 border-red-200 text-red-700' : order.status === 'cancelled' ? 'bg-gray-100 border-gray-300 text-gray-500' : 'bg-yellow-50 border-yellow-200 text-yellow-700' }`}>{ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select><div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor" className="text-current"><path d="M4 6L0 0H8L4 6Z" /></svg></div></div></td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handlePrintOrder(order)} className="text-gray-400 hover:text-brand-flamingo p-1.5 hover:bg-brand-flamingo/5 rounded transition-colors" title="Print Packing Slip"><Printer size={16} /></button>
                            <button onClick={() => handleOrderDeleteClick(order.id)} disabled={deletingOrderId === order.id} className={`p-1.5 rounded transition-all ${ deleteOrderConfirmation === order.id ? 'bg-red-50 text-red-500 ring-1 ring-red-200' : 'text-gray-300 hover:text-red-400 hover:bg-red-50' }`} title="Delete Order">{deletingOrderId === order.id ? (<Loader2 size={16} className="animate-spin" />) : deleteOrderConfirmation === order.id ? (<Check size={16} />) : (<Trash2 size={16} />)}</button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setExpandedOrderId(expandedOrderId === order.id ? null : order.id); }}
                                className="text-gray-400 hover:text-brand-flamingo p-1.5 rounded transition-colors"
                            >
                                {expandedOrderId === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                        </td>
                    </tr>
                    {/* EXPANDED ROW */}
                    {expandedOrderId === order.id && (
                        <tr className="bg-brand-grey/5 border-b border-brand-latte/20 animate-fade-in relative shadow-inner">
                        <td colSpan={7} className="p-0">
                            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                                {/* Left: Items */}
                                <div className="flex-1">
                                    <h4 className="font-serif text-sm font-bold uppercase tracking-widest text-gray-900 mb-4">Order Items</h4>
                                    <div className="space-y-4">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 items-center bg-white p-3 rounded-[2px] border border-brand-latte/20">
                                            <img src={item.image} className="w-12 h-16 object-cover bg-gray-100" />
                                            <div className="flex-1">
                                                <p className="font-serif text-gray-900">{item.name}</p>
                                                <p className="text-xs text-gray-500">{item.collection || 'Blankets'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                                <p className="font-bold text-gray-900">RM {item.price}</p>
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                    <div className="mt-4 text-right">
                                    <span className="text-xs uppercase tracking-widest text-gray-500 mr-4">Total Amount</span>
                                    <span className="font-serif text-xl text-gray-900">RM {order.total}</span>
                                    </div>
                                </div>

                                {/* Right: Details */}
                                <div className="w-full md:w-1/3 space-y-6">
                                    {/* Shipping */}
                                    <div>
                                    <h4 className="font-serif text-sm font-bold uppercase tracking-widest text-gray-900 mb-2 flex items-center gap-2">
                                        <MapPin size={14} /> Shipping Details
                                    </h4>
                                    <div className="bg-white p-4 rounded-[2px] border border-brand-latte/20 text-sm text-gray-600 leading-relaxed">
                                        <p className="font-bold text-gray-900 mb-1">{order.customerName}</p>
                                        <p>{order.shippingAddress}</p>
                                        <div className="mt-3 pt-3 border-t border-brand-latte/10 flex flex-col gap-1 text-xs">
                                            <p className="flex items-center gap-2"><Mail size={12}/> {order.customerEmail}</p>
                                            <p className="flex items-center gap-2"><Phone size={12}/> {order.customerPhone}</p>
                                        </div>
                                    </div>
                                    </div>

                                    {/* Gift Info */}
                                    {order.isGift && (
                                    <div>
                                        <h4 className="font-serif text-sm font-bold uppercase tracking-widest text-brand-gold mb-2 flex items-center gap-2">
                                            <Gift size={14} /> Gift Message
                                        </h4>
                                        <div className="bg-white p-4 rounded-[2px] border border-brand-latte/20 text-sm">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between border-b border-brand-latte/10 pb-2">
                                                <span className="text-xs text-gray-400 uppercase tracking-wide">To</span>
                                                <span className="font-serif text-gray-900">{order.giftTo || '-'}</span>
                                                </div>
                                                <div className="flex justify-between pt-1">
                                                <span className="text-xs text-gray-400 uppercase tracking-wide">From</span>
                                                <span className="font-serif text-gray-900">{order.giftFrom || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    )}
                                    
                                    {/* Status Change (Duplicate of row action but handy in detail view) */}
                                    <div>
                                    <h4 className="font-serif text-sm font-bold uppercase tracking-widest text-gray-900 mb-2">Update Status</h4>
                                    <div className="bg-white border border-brand-latte/20 p-4 rounded-[2px]">
                                        {/* Status Info for Admin */}
                                        {order.status === 'pending' && isStalePending(order) && (
                                            <div className="mb-3 text-[10px] text-red-500 bg-red-50 p-2 rounded border border-red-100 flex gap-2">
                                                <AlertTriangle size={14} className="flex-shrink-0" />
                                                This order has been pending for more than 5 minutes. The stock is still reserved. Change to 'Cancelled' to release stock.
                                            </div>
                                        )}
                                        <select 
                                            value={order.status} 
                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.status)} 
                                            className="w-full bg-white border border-brand-latte/30 px-3 py-2 rounded-[2px] text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo"
                                        >
                                            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </td>
                        </tr>
                    )}
                    </React.Fragment>
                ))}
                </tbody>
            </table>
            </div>

            {/* Pagination Controls */}
            {filteredOrders.length > itemsPerPage && (
                <div className="border-t border-brand-latte/20 bg-brand-grey/5 p-4 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
                        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 bg-white border border-brand-latte/20 rounded-[2px] text-gray-500 hover:text-brand-flamingo disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                        <span className="text-xs font-bold text-gray-700 px-2">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 bg-white border border-brand-latte/20 rounded-[2px] text-gray-500 hover:text-brand-flamingo disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                    </div>
                </div>
            )}
        </div>
        )}
    </div>
  );
};
