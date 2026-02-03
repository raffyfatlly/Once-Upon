
import React, { useState, useRef, useEffect } from 'react';
import { Product, SiteConfig, Order, Subscriber } from '../types';
import { Trash2, Edit2, Plus, Image as ImageIcon, LogOut, Search, User, Package, Calendar, Upload, X, Loader2, Check, Link, Database, AlertTriangle, ShieldAlert, Phone, Filter, Copy, ExternalLink, Settings, RefreshCw, Printer, CheckSquare, Square, ClipboardCopy, Clock, Heart, Mail, Download } from 'lucide-react';
import { addProductToDb, updateProductInDb, deleteProductFromDb, updateOrderStatusInDb, deleteOrderFromDb, uploadImage, subscribeToSubscribers, resetOrderSystem } from '../firebase';

interface AdminDashboardProps {
  products: Product[];
  orders: Order[];
  siteConfig: SiteConfig;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateSiteConfig: (config: SiteConfig) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  products, 
  orders,
  siteConfig, 
  onUpdateProducts, 
  onUpdateSiteConfig,
  onUpdateOrders,
  onLogout 
}) => {
  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'club' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'uploading' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  
  // Sales Filters & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleteOrderConfirmation, setDeleteOrderConfirmation] = useState<string | null>(null);

  // Subscribers State
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  // Diagnostic State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'none' | 'success' | 'fail'>('none');
  const [testMessage, setTestMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Refs for inputs
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [newAdditionalUrl, setNewAdditionalUrl] = useState('');

  // Fetch Subscribers
  useEffect(() => {
    const unsubscribe = subscribeToSubscribers((subs) => {
      setSubscribers(subs);
    });
    return () => unsubscribe();
  }, []);

  // Listen for PWA install prompt event
  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log("PWA install prompt captured");
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
  };

  // Derive unique collections from existing products for autocomplete
  // Safety check: ensure products is an array
  const safeProducts = Array.isArray(products) ? products : [];
  const existingCollections = Array.from(new Set(safeProducts.map(p => p.collection || 'Blankets'))).sort();

  // Form State
  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    price: 0,
    description: '',
    image: '',
    additionalImages: [],
    badge: '',
    material: '',
    care: '',
    collection: 'Blankets',
    size: ''
  });

  const handleEdit = (product: Product) => {
    setFormData({
        ...product,
        collection: product.collection || 'Blankets',
        additionalImages: product.additionalImages || [],
        size: product.size || ''
    });
    setEditingProduct(product);
    setIsEditing(true);
    setSaveStatus('idle');
    setErrorMessage('');
    setNewAdditionalUrl('');
  };

  const handleCreate = () => {
    setFormData({
      id: '',
      name: '',
      price: 0,
      description: '',
      image: '',
      additionalImages: [],
      badge: '',
      material: '',
      care: '',
      collection: 'Blankets',
      size: ''
    });
    setEditingProduct(null);
    setIsEditing(true);
    setSaveStatus('idle');
    setErrorMessage('');
    setNewAdditionalUrl('');
  };

  const handleDeleteClick = (id: string) => {
    if (deleteConfirmation === id) {
      handleDelete(id);
    } else {
      setDeleteConfirmation(id);
      setTimeout(() => {
        setDeleteConfirmation(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setDeleteConfirmation(null);
    
    try {
      await deleteProductFromDb(id);
    } catch (error: any) {
      console.error("Delete Error:", error);
      const msg = error.message || "Unknown error";
      alert("Failed to delete product: " + msg);
    } finally {
      setDeletingId(null);
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

  const handleSeedData = async () => {
    setIsSeeding(true);
    
    const SEED_DATA = [
      {
        name: 'The Dream Castle',
        price: 185,
        description: 'An intricate illustration of a whimsical palace in the clouds. Woven from the finest cashmere, this piece features subtle turret details and starry accents.',
        image: 'https://i.postimg.cc/9QVBP1b5/Gemini-Generated-Image-s2ybu4s2ybu4s2yb.png',
        material: '100% Grade-A Mongolian Cashmere',
        care: 'Dry clean recommended. Hand wash cold with gentle detergent. Lay flat to dry.',
        collection: 'Blankets',
        size: '120cm x 120cm',
        additionalImages: []
      },
      {
        name: 'The Parisian Flight',
        price: 145,
        description: 'A majestic voyage begins. Vintage hot air balloons drifting over Parisian rooftops. A delicate blend of organic cotton and silk, finished with a refined latte border.',
        image: 'https://i.postimg.cc/cCSNXQ23/Gemini-Generated-Image-tit282tit282tit2.png',
        material: '80% Organic Cotton, 20% Mulberry Silk',
        care: 'Machine wash delicate cycle in laundry bag. Tumble dry low.',
        collection: 'Blankets',
        size: '110cm x 110cm',
        additionalImages: []
      }
    ];

    try {
      for (const data of SEED_DATA) {
        await addProductToDb(data as any);
      }
      alert("Sample data uploaded successfully! The products should appear shortly.");
    } catch (error: any) {
      console.error("Seed Error:", error);
      alert(`Error uploading data: ${error.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    setErrorMessage('');
    
    try {
      if (editingProduct && editingProduct.id) {
        const { id, ...data } = formData;
        await updateProductInDb(id, data);
      } else {
        const { id, ...data } = formData;
        await addProductToDb(data);
      }
      setSaveStatus('saved');
      setTimeout(() => {
        setIsEditing(false);
        setSaveStatus('idle');
      }, 1000);
    } catch (error: any) {
      console.error(error);
      setSaveStatus('error');
      setErrorMessage(error.message || "Unknown error");
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatusInDb(orderId, newStatus as Order['status']);
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'hero' | 'additional') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File too large. Please select an image under 5MB.");
        return;
      }
      setSaveStatus('uploading');
      setErrorMessage('');
      
      try {
        const downloadURL = await uploadImage(file);
        if (type === 'product') {
          setFormData(prev => ({ ...prev, image: downloadURL }));
        } else if (type === 'additional') {
          setFormData(prev => ({ 
            ...prev, 
            additionalImages: [...(prev.additionalImages || []), downloadURL] 
          }));
        } else {
          onUpdateSiteConfig({ ...siteConfig, heroImage: downloadURL });
        }
        setSaveStatus('idle');
      } catch (error: any) {
        console.error("Upload failed details:", error);
        setSaveStatus('error');
        setErrorMessage(error.message || "Upload Failed");
      }
    }
  };

  const addUrlToAdditional = () => {
    if (!newAdditionalUrl) return;
    setFormData(prev => ({
      ...prev,
      additionalImages: [...(prev.additionalImages || []), newAdditionalUrl]
    }));
    setNewAdditionalUrl('');
  };

  const removeAdditionalImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalImages: prev.additionalImages?.filter((_, i) => i !== index) || []
    }));
  };

  const handleConnectionTest = async () => {
    setIsTesting(true);
    setTestResult('none');
    setTestMessage('');
    
    try {
      const blob = new Blob(["test"], { type: 'text/plain' });
      const testFile = new File([blob], "connection_test.txt", { type: "text/plain" });
      await uploadImage(testFile);
      setTestResult('success');
      setTestMessage("Success! Storage is connected and writable.");
    } catch (error: any) {
      setTestResult('fail');
      setTestMessage(error.message || "Unknown error occurred");
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetOrders = async () => {
    if (!window.confirm("Are you sure? This will DELETE ALL EXISTING ORDERS and reset the order ID counter to 1000. This cannot be undone.")) return;
    
    setIsResetting(true);
    try {
      await resetOrderSystem();
      alert("System Reset! Order counter is now 1000. All old orders are gone.");
    } catch (error: any) {
      alert("Reset failed: " + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  // --- Date Range Helper ---
  const setQuickDate = (range: 'today' | 'week' | 'month' | 'clear') => {
    if (range === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const end = new Date();
    const start = new Date();

    if (range === 'today') {
      // Start is today 00:00, end is today now
    } else if (range === 'week') {
      start.setDate(end.getDate() - 7);
    } else if (range === 'month') {
      start.setDate(end.getDate() - 30);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  // --- Printing Functionality ---
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
          body { 
            font-family: 'Playfair Display', serif; 
            padding: 40px; 
            color: #1a1a1a; 
            max-width: 800px; 
            margin: 0 auto;
          }
          .header { text-align: center; margin-bottom: 60px; }
          .brand { 
            font-size: 32px; 
            letter-spacing: 0.1em; 
            font-weight: 700; 
            text-transform: uppercase; 
            margin-bottom: 5px;
          }
          .location {
            font-family: 'Pinyon Script', cursive;
            font-size: 24px;
            color: #C5A992; /* brand-goldish */
            margin-bottom: 20px;
          }
          .doc-type {
            font-family: 'Lato', sans-serif;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
            padding: 12px 0;
            margin-top: 20px;
            color: #666;
          }
          
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .box h4 {
            font-family: 'Lato', sans-serif;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #999;
            margin: 0 0 10px 0;
          }
          .box p {
            font-family: 'Lato', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
            color: #333;
          }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 60px; }
          th { 
            text-align: left; 
            border-bottom: 1px solid #1a1a1a; 
            padding: 15px 0; 
            font-family: 'Lato', sans-serif;
            font-size: 10px; 
            text-transform: uppercase; 
            letter-spacing: 0.15em; 
            color: #666;
          }
          td { 
            padding: 20px 0; 
            border-bottom: 1px solid #f5f5f5; 
            vertical-align: top;
          }
          .qty-col { text-align: center; width: 60px; }
          
          .item-name { 
            font-family: 'Playfair Display', serif;
            font-weight: 600; /* reduced from 700 to 600 */
            font-size: 14px; /* reduced from 18px */
            margin-bottom: 4px; 
            color: #1a1a1a;
          }
          .item-detail { 
            font-family: 'Lato', sans-serif; 
            font-size: 10px; 
            color: #888; 
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .qty-value {
            font-family: 'Lato', sans-serif;
            font-size: 14px; /* reduced from 16px */
            font-weight: 400; /* removed bold */
            color: #333;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 80px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .signature {
            font-family: 'Pinyon Script', cursive;
            font-size: 28px;
            color: #C5A992;
            margin-bottom: 10px;
          }
          .ig-link {
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Lato', sans-serif;
            font-size: 10px;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            color: #999;
            text-decoration: none;
          }
          .ig-link svg {
            margin-right: 8px;
            color: #D9C4B8; /* brand-latte color */
          }
          
          @media print {
             body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Once Upon</div>
          <div class="location">Kuala Lumpur</div>
          <div class="doc-type">Packing Slip</div>
        </div>

        <div class="grid">
           <div class="box">
             <h4>Recipient</h4>
             <p>
               <strong>${order.customerName}</strong><br>
               ${order.shippingAddress}<br>
               ${order.customerPhone || ''}
             </p>
           </div>
           <div class="box" style="text-align: right;">
             <h4>Order Details</h4>
             <p>
               Order #${order.id}<br>
               ${new Date(order.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
             </p>
           </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th class="qty-col">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => {
              // Smart Collection Name Logic
              const collectionName = (!item.collection || item.collection === 'Blankets') 
                ? 'Blanket Collection' 
                : item.collection;

              return `
                <tr>
                  <td>
                    <div class="item-name">${item.name}</div>
                    <div class="item-detail">${collectionName}</div>
                  </td>
                  <td class="qty-col">
                    <span class="qty-value">${item.quantity}</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div class="signature">Designed with Love</div>
          <div class="ig-link">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
               <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
               <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
             </svg>
             @onceuponbysyahirahkasim
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- Bulk Selection & Filter Logic ---
  
  // Toggle individual order selection
  const toggleOrderSelection = (id: string) => {
    const newSet = new Set(selectedOrders);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedOrders(newSet);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.includes(searchQuery) ||
      (order.customerPhone && order.customerPhone.includes(searchQuery));
      
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    // Date Filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const orderDate = new Date(order.date);
      if (startDate) {
        matchesDate = matchesDate && orderDate >= new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= end;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Toggle Select All Visible
  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  // --- Bulk Copy Functionality ---
  const handleBulkCopy = () => {
    const ordersToExport = orders.filter(o => selectedOrders.has(o.id));
    if (ordersToExport.length === 0) return;

    const exportText = ordersToExport.map(o => {
      return `ORDER #${o.id}
Date: ${new Date(o.date).toLocaleDateString()}
Customer: ${o.customerName}
Phone: ${o.customerPhone}
Address: ${o.shippingAddress}
Items:
${o.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n')}
--------------------------------`;
    }).join('\n\n');

    navigator.clipboard.writeText(exportText)
      .then(() => alert(`${ordersToExport.length} orders copied to clipboard!`))
      .catch(err => alert("Failed to copy to clipboard"));
  };

  const handleCopyEmails = () => {
    if (subscribers.length === 0) return;
    const emails = subscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails)
      .then(() => alert(`${subscribers.length} emails copied!`))
      .catch(() => alert("Failed to copy emails."));
  };

  const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'failed', 'cancelled'];

  return (
    <div className="min-h-screen bg-brand-grey/10 font-sans pb-20">
      {/* Admin Nav */}
      <nav className="bg-white border-b border-brand-latte/20 sticky top-0 z-40">
        <div className="px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg md:text-xl font-bold tracking-wider">ONCE UPON</span>
              <span className="bg-brand-grey px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold text-gray-500 rounded">Admin</span>
            </div>
            <button onClick={onLogout} className="md:hidden text-gray-400">
              <LogOut size={18} />
            </button>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0 border-t md:border-t-0 border-brand-latte/10 pt-3 md:pt-0">
            <button 
              onClick={() => setActiveTab('products')}
              className={`text-xs uppercase tracking-widest font-bold transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'products' ? 'text-brand-flamingo' : 'text-gray-400'}`}
            >
              Products
            </button>
            <button 
              onClick={() => setActiveTab('sales')}
              className={`text-xs uppercase tracking-widest font-bold transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'sales' ? 'text-brand-flamingo' : 'text-gray-400'}`}
            >
              Sales & Customers
            </button>
             <button 
              onClick={() => setActiveTab('club')}
              className={`text-xs uppercase tracking-widest font-bold transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'club' ? 'text-brand-flamingo' : 'text-gray-400'}`}
            >
              Mum's Club
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`text-xs uppercase tracking-widest font-bold transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'settings' ? 'text-brand-flamingo' : 'text-gray-400'}`}
            >
              Settings & Fixes
            </button>
            <button onClick={onLogout} className="hidden md:block text-gray-400 hover:text-gray-900 ml-4 border-l border-brand-latte/20 pl-6">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-6xl">
        
        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <h2 className="font-serif text-2xl md:text-3xl text-gray-900">Product Management</h2>
              <button 
                onClick={handleCreate}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-gray-900 text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-flamingo transition-colors rounded-[2px]"
              >
                <Plus size={14} /> Add Product
              </button>
            </div>

            {isEditing ? (
              <div className="bg-white p-6 md:p-8 border border-brand-latte/20 shadow-sm animate-fade-in max-w-2xl mx-auto rounded-[2px]">
                 <h3 className="font-serif text-xl md:text-2xl mb-6">{editingProduct ? 'Edit Product' : 'New Product'}</h3>
                 <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:gap-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Product Name</label>
                      <input required className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Collection</label>
                      <input 
                        list="collection-options"
                        className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" 
                        value={formData.collection || ''} 
                        onChange={e => setFormData({...formData, collection: e.target.value})}
                        placeholder="e.g. Blankets"
                      />
                      <datalist id="collection-options">
                        {existingCollections.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Price (RM)</label>
                        <input required type="number" className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Badge (Optional)</label>
                        <input className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" placeholder="e.g. New" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Description</label>
                      <textarea required rows={3} className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Material</label>
                           <input className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" value={formData.material || ''} onChange={e => setFormData({...formData, material: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Size / Dimensions</label>
                           <input className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" placeholder="e.g. 120cm x 120cm" value={formData.size || ''} onChange={e => setFormData({...formData, size: e.target.value})} />
                        </div>
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Care Instructions</label>
                       <textarea rows={2} className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" value={formData.care || ''} onChange={e => setFormData({...formData, care: e.target.value})} />
                    </div>
                    
                    {/* Main Image Upload/URL Section */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Main Product Image</label>
                      
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-2 items-center">
                           <div className="relative flex-1">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                               <Link size={14} />
                             </div>
                             <input 
                               className="w-full border p-3 pl-9 pr-8 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5 font-mono text-xs" 
                               placeholder="Paste Image URL here..."
                               value={formData.image} 
                               onChange={e => setFormData({...formData, image: e.target.value})} 
                             />
                             {formData.image && (
                               <button 
                                 type="button"
                                 onClick={() => setFormData({...formData, image: ''})}
                                 className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400"
                               >
                                 <X size={14} />
                               </button>
                             )}
                           </div>
                           
                           <span className="text-[10px] text-gray-400 font-bold uppercase mx-1">OR</span>
                           
                           <button 
                              type="button"
                              onClick={() => productFileInputRef.current?.click()}
                              className="bg-white border border-brand-latte/30 text-gray-600 hover:text-brand-flamingo hover:border-brand-flamingo px-4 py-3 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider min-w-[100px] justify-center"
                              title="Upload Photo"
                              disabled={saveStatus === 'uploading'}
                           >
                             {saveStatus === 'uploading' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} 
                             Upload
                           </button>
                           <input 
                             type="file" 
                             accept="image/*" 
                             ref={productFileInputRef}
                             className="hidden"
                             onChange={(e) => handleFileUpload(e, 'product')}
                           />
                        </div>
                        
                        {/* Error Message Display Area */}
                        {saveStatus === 'error' && (
                           <div className="bg-red-50 p-4 rounded border border-red-100 flex flex-col gap-3 mt-2 animate-fade-in">
                             <div className="flex items-center gap-2 text-red-600 font-bold">
                               <AlertTriangle size={18} />
                               <span className="text-xs">Upload Failed</span>
                             </div>
                             
                             <div className="text-xs text-gray-700 space-y-2">
                               <p className="leading-relaxed">
                                  <strong>Reason:</strong> {errorMessage}
                               </p>
                             </div>
                           </div>
                        )}

                        <div className="flex items-start gap-4 p-4 border border-dashed border-brand-latte/30 bg-brand-grey/5 rounded-[2px] mt-2">
                           {formData.image ? (
                             <img src={formData.image} alt="Preview" className="w-20 h-28 object-cover border border-brand-latte/30 bg-white" />
                           ) : (
                             <div className="w-20 h-28 bg-brand-latte/10 flex items-center justify-center text-gray-400 text-xs text-center border border-brand-latte/20">No Image</div>
                           )}
                           <div>
                             <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Preview & Tips</p>
                             <p className="text-[10px] text-gray-400 leading-relaxed max-w-xs">
                               Recommended Size: <strong className="text-gray-600">600x800 px</strong> (Portrait 3:4 Aspect Ratio).
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Images Section */}
                    <div className="border-t border-brand-latte/20 pt-6 mt-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Gallery Images (Optional)</label>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-4">
                         {formData.additionalImages?.map((img, index) => (
                           <div key={index} className="relative aspect-[3/4] group bg-gray-50 border border-brand-latte/20">
                              <img src={img} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeAdditionalImage(index)}
                                className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                              >
                                <X size={12} />
                              </button>
                           </div>
                         ))}
                         
                         {/* Upload Button Box */}
                         <div className="aspect-[3/4] border border-dashed border-brand-latte/40 bg-brand-grey/5 flex flex-col items-center justify-center gap-2 p-2 text-center hover:bg-brand-grey/10 transition-colors">
                            <button 
                               type="button" 
                               onClick={() => additionalFileInputRef.current?.click()}
                               disabled={saveStatus === 'uploading'}
                               className="text-gray-500 hover:text-brand-flamingo flex flex-col items-center"
                            >
                               {saveStatus === 'uploading' ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />} 
                               <span className="text-[9px] font-bold uppercase mt-1">Upload File</span>
                            </button>
                            <input 
                               type="file" 
                               accept="image/*" 
                               ref={additionalFileInputRef}
                               className="hidden"
                               onChange={(e) => handleFileUpload(e, 'additional')}
                            />
                         </div>
                      </div>

                      {/* URL Add for Additional */}
                      <div className="flex gap-2 items-center mt-2">
                         <div className="relative flex-1">
                             <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                               <Link size={14} />
                             </div>
                             <input 
                               className="w-full border p-2 pl-9 pr-4 text-xs focus:border-brand-flamingo outline-none bg-brand-grey/5 font-mono" 
                               placeholder="Or paste URL for additional image..."
                               value={newAdditionalUrl} 
                               onChange={e => setNewAdditionalUrl(e.target.value)}
                               onKeyDown={e => {
                                 if (e.key === 'Enter') {
                                   e.preventDefault();
                                   addUrlToAdditional();
                                 }
                               }}
                             />
                         </div>
                         <button 
                            type="button" 
                            onClick={addUrlToAdditional}
                            disabled={!newAdditionalUrl}
                            className="bg-brand-latte text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-flamingo disabled:opacity-50 disabled:cursor-not-allowed rounded-[2px]"
                         >
                            Add
                         </button>
                      </div>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-4 border-t border-brand-latte/20 pt-6">
                      <button 
                        type="button" 
                        onClick={() => setIsEditing(false)} 
                        className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-gray-900 border border-transparent hover:border-gray-200"
                        disabled={saveStatus !== 'idle' && saveStatus !== 'error'}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={saveStatus !== 'idle' && saveStatus !== 'error'}
                        className={`text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest rounded-[2px] flex items-center gap-2 transition-all ${
                          saveStatus === 'saved' ? 'bg-green-600' : 'bg-brand-flamingo hover:bg-brand-flamingo/80'
                        }`}
                      >
                        {saveStatus === 'saving' ? (
                          <><Loader2 size={14} className="animate-spin" /> Saving...</>
                        ) : saveStatus === 'saved' ? (
                          <><Check size={14} /> Saved!</>
                        ) : (
                          'Save Product'
                        )}
                      </button>
                    </div>
                 </form>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                 {/* Product List Content */}
                 {safeProducts.length === 0 && (
                   <div className="col-span-full text-center p-12 text-gray-400 italic flex flex-col items-center">
                     <p className="mb-4">No products found in database.</p>
                     <div className="p-6 bg-white border border-dashed border-brand-latte/50 rounded flex flex-col items-center max-w-md">
                        <Database className="text-brand-flamingo mb-3" size={32} strokeWidth={1} />
                        <h4 className="font-serif text-lg text-gray-900 mb-2">Initialize Database?</h4>
                        <p className="text-xs text-gray-500 mb-4 text-center">
                          Your Firebase database is currently empty. Click below to upload the sample products to the database.
                        </p>
                        <button 
                          type="button"
                          onClick={handleSeedData}
                          disabled={isSeeding}
                          className="bg-brand-gold text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-flamingo transition-colors rounded-[2px] flex items-center gap-2 cursor-pointer relative z-10"
                        >
                          {isSeeding ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />}
                          Load Sample Data
                        </button>
                     </div>
                   </div>
                )}
                {safeProducts.map(product => (
                  <div key={product.id} className="bg-white border border-brand-latte/20 p-4 flex gap-4 items-center group rounded-[2px] shadow-sm">
                    <img src={product.image} alt={product.name} className="w-16 h-16 md:w-20 md:h-20 object-cover bg-gray-100 rounded-[2px]" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base md:text-lg text-gray-900 leading-tight mb-1 truncate">{product.name}</h4>
                      <div className="flex flex-col">
                        <p className="text-brand-gold font-script text-base md:text-lg">RM {product.price}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleEdit(product)} className="text-gray-400 hover:text-brand-flamingo p-1"><Edit2 size={16} /></button>
                      <button 
                        onClick={() => handleDeleteClick(product.id)} 
                        disabled={deletingId === product.id}
                        className={`p-1 transition-all rounded ${
                          deleteConfirmation === product.id 
                            ? 'text-red-500 bg-red-50 w-full text-[10px] font-bold uppercase flex items-center justify-center gap-1 p-2' 
                            : 'text-gray-400 hover:text-red-400'
                        }`}
                        title={deleteConfirmation === product.id ? "Click to Confirm" : "Delete"}
                      >
                        {deletingId === product.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : deleteConfirmation === product.id ? (
                          <>Confirm?</>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        
        {/* ... (Other Tabs remain unchanged) ... */}
        {activeTab === 'sales' && (
           <div className="animate-fade-in">
             {/* ... Sales Tab Content ... */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div>
                 <h2 className="font-serif text-2xl md:text-3xl text-gray-900">Sales & Customers</h2>
                 <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Manage orders and check status</p>
               </div>
               
               {/* Search, Filter, Date Toolbar */}
               <div className="flex flex-col w-full md:w-auto gap-4">
                 
                 {/* Top Row: Date Selection */}
                 <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white border border-brand-latte/20 p-2 rounded-[2px]">
                    <div className="flex gap-2 items-center px-2 text-gray-400">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Date Range</span>
                    </div>
                    
                    {/* Quick Select Buttons */}
                    <div className="flex gap-1">
                      <button onClick={() => setQuickDate('today')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand-grey/10 hover:bg-brand-flamingo hover:text-white rounded-[2px] transition-colors">Today</button>
                      <button onClick={() => setQuickDate('week')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand-grey/10 hover:bg-brand-flamingo hover:text-white rounded-[2px] transition-colors">7 Days</button>
                      <button onClick={() => setQuickDate('month')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand-grey/10 hover:bg-brand-flamingo hover:text-white rounded-[2px] transition-colors">30 Days</button>
                      {(startDate || endDate) && (
                        <button onClick={() => setQuickDate('clear')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-50 rounded-[2px] transition-colors">Clear</button>
                      )}
                    </div>

                    <div className="h-6 w-[1px] bg-brand-latte/20 hidden sm:block"></div>

                    {/* Manual Inputs - Optimized Layout */}
                    <div className="flex gap-2 items-center flex-1 w-full sm:w-auto">
                      <div className="relative w-full sm:w-auto group">
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-latte group-hover:text-brand-flamingo transition-colors">
                           <Calendar size={14} />
                        </div>
                        <input 
                           type="date"
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           onClick={(e) => (e.currentTarget as any).showPicker()}
                           className="pl-3 pr-8 py-1.5 bg-brand-grey/5 hover:bg-white border border-transparent hover:border-brand-latte/30 rounded-[2px] text-[10px] font-bold uppercase tracking-widest text-gray-600 focus:outline-none focus:border-brand-flamingo w-full sm:w-auto cursor-pointer transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                      </div>
                      
                      <span className="text-gray-300">-</span>
                      
                      <div className="relative w-full sm:w-auto group">
                         <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-latte group-hover:text-brand-flamingo transition-colors">
                           <Calendar size={14} />
                        </div>
                        <input 
                           type="date"
                           value={endDate}
                           onChange={(e) => setEndDate(e.target.value)}
                           onClick={(e) => (e.currentTarget as any).showPicker()}
                           className="pl-3 pr-8 py-1.5 bg-brand-grey/5 hover:bg-white border border-transparent hover:border-brand-latte/30 rounded-[2px] text-[10px] font-bold uppercase tracking-widest text-gray-600 focus:outline-none focus:border-brand-flamingo w-full sm:w-auto cursor-pointer transition-all [&::-webkit-calendar-picker-indicator]:hidden"
                        />
                      </div>
                    </div>
                 </div>

                 {/* Bottom Row: Status & Search */}
                 <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative">
                        <select 
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="appearance-none bg-white border border-brand-latte/30 px-4 py-3 pr-10 rounded-[2px] text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo text-gray-600 w-full md:w-32"
                        >
                          <option value="all">All Status</option>
                          {ORDER_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                      <div className="relative flex-1">
                        <input 
                          type="text" 
                          placeholder="Search order #, name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-brand-latte/30 focus:border-brand-flamingo outline-none text-sm rounded-[2px] shadow-sm"
                        />
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                  </div>
               </div>
             </div>

             {/* Bulk Actions Bar */}
             {selectedOrders.size > 0 && (
               <div className="bg-brand-flamingo/5 border border-brand-flamingo/20 p-3 rounded-[2px] mb-4 flex items-center justify-between animate-fade-in">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-flamingo px-2">
                    {selectedOrders.size} Selected
                  </span>
                  <button 
                    onClick={handleBulkCopy}
                    className="bg-white border border-brand-flamingo/20 text-brand-flamingo px-4 py-2 rounded-[2px] text-[10px] font-bold uppercase tracking-widest hover:bg-brand-flamingo hover:text-white transition-colors flex items-center gap-2"
                  >
                    <ClipboardCopy size={14} /> Copy Details
                  </button>
               </div>
             )}
             
             {filteredOrders.length === 0 ? (
               <div className="text-center py-24 bg-white border border-dashed border-brand-latte/30 rounded-[2px]">
                 <Package size={32} className="mx-auto text-brand-latte mb-3 opacity-50" />
                 <p className="text-gray-400 text-sm">No orders found matching filters.</p>
                 {(searchQuery || filterStatus !== 'all' || startDate || endDate) && (
                   <button 
                    onClick={() => {setSearchQuery(''); setFilterStatus('all'); setStartDate(''); setEndDate('');}} 
                    className="text-brand-flamingo text-xs font-bold uppercase mt-2 hover:underline"
                   >
                     Clear Filters
                   </button>
                 )}
               </div>
             ) : (
               <div className="bg-white border border-brand-latte/20 rounded-[2px] shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse min-w-[900px]">
                     <thead>
                       <tr className="bg-brand-grey/10 border-b border-brand-latte/20">
                         <th className="p-4 w-12">
                            <button onClick={toggleSelectAll} className="text-gray-400 hover:text-brand-flamingo">
                              {selectedOrders.size > 0 && selectedOrders.size === filteredOrders.length ? (
                                <CheckSquare size={16} className="text-brand-flamingo" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                         </th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Order ID / Date</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Customer</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Items</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-24 text-center">Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredOrders.map(order => (
                         <tr key={order.id} className={`border-b border-brand-latte/10 transition-colors ${selectedOrders.has(order.id) ? 'bg-brand-flamingo/5' : 'hover:bg-brand-grey/5'}`}>
                           <td className="p-4">
                             <button onClick={() => toggleOrderSelection(order.id)} className="text-gray-400 hover:text-brand-flamingo">
                               {selectedOrders.has(order.id) ? (
                                 <CheckSquare size={16} className="text-brand-flamingo" />
                               ) : (
                                 <Square size={16} />
                               )}
                             </button>
                           </td>
                           <td className="p-4">
                             <div className="font-mono text-xs text-gray-400" title={order.id}>
                               {order.id.length > 8 ? `#${order.id.substring(0,6)}...` : `#${order.id}`}
                             </div>
                             <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                               <Calendar size={10} /> {new Date(order.date).toLocaleDateString()}
                             </div>
                           </td>
                           <td className="p-4">
                             <div className="flex items-start gap-2">
                               <div className="bg-brand-latte/20 p-1.5 rounded-full mt-0.5">
                                 <User size={12} className="text-brand-latte" />
                               </div>
                               <div>
                                 <div className="font-serif text-gray-900">{order.customerName}</div>
                                 <div className="text-xs text-gray-400">{order.customerEmail}</div>
                                 {order.customerPhone && (
                                   <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                     <Phone size={10} /> {order.customerPhone}
                                   </div>
                                 )}
                               </div>
                             </div>
                           </td>
                           <td className="p-4">
                             <div className="text-xs text-gray-600">
                               {order.items.map(i => (
                                 <div key={i.id} className="mb-1">
                                   {i.quantity}x {i.name}
                                 </div>
                               ))}
                             </div>
                           </td>
                           <td className="p-4 font-bold text-sm text-gray-900">
                             RM {order.total}
                           </td>
                           <td className="p-4">
                             <div className="relative inline-block">
                               <select 
                                 value={order.status}
                                 onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                                 className={`appearance-none pl-3 pr-8 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-flamingo ${
                                   order.status === 'delivered' ? 'bg-green-50 border-green-200 text-green-700' :
                                   order.status === 'shipped' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                   order.status === 'paid' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' :
                                   order.status === 'failed' ? 'bg-red-50 border-red-200 text-red-700' :
                                   order.status === 'cancelled' ? 'bg-gray-100 border-gray-300 text-gray-500' :
                                   'bg-yellow-50 border-yellow-200 text-yellow-700'
                                 }`}
                               >
                                 {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                               {/* Custom Arrow for select */}
                               <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                 <svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor" className="text-current">
                                   <path d="M4 6L0 0H8L4 6Z" />
                                 </svg>
                               </div>
                             </div>
                           </td>
                           <td className="p-4 text-center">
                             <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => handlePrintOrder(order)}
                                 className="text-gray-400 hover:text-brand-flamingo p-1.5 hover:bg-brand-flamingo/5 rounded transition-colors"
                                 title="Print Packing Slip"
                               >
                                 <Printer size={16} />
                               </button>
                               <button 
                                  onClick={() => handleOrderDeleteClick(order.id)}
                                  disabled={deletingOrderId === order.id}
                                  className={`p-1.5 rounded transition-all ${
                                    deleteOrderConfirmation === order.id 
                                    ? 'bg-red-50 text-red-500 ring-1 ring-red-200' 
                                    : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                                  }`}
                                  title="Delete Order"
                               >
                                 {deletingOrderId === order.id ? (
                                   <Loader2 size={16} className="animate-spin" />
                                 ) : deleteOrderConfirmation === order.id ? (
                                   <Check size={16} />
                                 ) : (
                                   <Trash2 size={16} />
                                 )}
                               </button>
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
           </div>
        )}

        {/* MUM'S CLUB TAB */}
        {activeTab === 'club' && (
          <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <div>
                 <h2 className="font-serif text-2xl md:text-3xl text-gray-900 flex items-center gap-2">
                    Mum's Club <Heart size={18} className="text-brand-flamingo fill-brand-flamingo/20" />
                 </h2>
                 <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Newsletter Subscribers</p>
               </div>
               
               {subscribers.length > 0 && (
                 <button 
                   onClick={handleCopyEmails}
                   className="flex items-center gap-2 bg-white border border-brand-latte/30 px-4 py-2 rounded-[2px] text-[10px] font-bold uppercase tracking-widest hover:border-brand-flamingo hover:text-brand-flamingo transition-colors shadow-sm"
                 >
                   <Copy size={14} /> Copy All Emails
                 </button>
               )}
             </div>

             {subscribers.length === 0 ? (
               <div className="text-center py-24 bg-white border border-dashed border-brand-latte/30 rounded-[2px]">
                 <Mail size={32} className="mx-auto text-brand-latte mb-3 opacity-50" />
                 <p className="text-gray-400 text-sm">No members yet.</p>
               </div>
             ) : (
               <div className="bg-white border border-brand-latte/20 rounded-[2px] shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-brand-grey/10 border-b border-brand-latte/20">
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-16">#</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Email Address</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 text-right">Date Joined</th>
                       </tr>
                     </thead>
                     <tbody>
                       {subscribers.map((sub, index) => (
                         <tr key={sub.id} className="border-b border-brand-latte/10 hover:bg-brand-grey/5 transition-colors">
                           <td className="p-4 text-xs text-gray-400 font-mono">
                             {index + 1}
                           </td>
                           <td className="p-4 font-sans text-sm text-gray-800">
                             {sub.email}
                           </td>
                           <td className="p-4 text-right text-xs text-gray-500">
                             {new Date(sub.date).toLocaleDateString()}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto animate-fade-in">
             <div className="bg-white border border-brand-latte/30 p-8 rounded-[2px] shadow-sm mb-8">
               
               {/* PWA Install Section (Top of Settings) - VISIBLE EVEN IF PROMPT NOT READY FOR DEBUGGING */}
               <div className="mb-8 border-b border-brand-latte/20 pb-8">
                 <h3 className="font-serif text-xl text-gray-900 mb-4 flex items-center gap-3">
                   <Download className="text-brand-gold" size={20} />
                   Install App
                 </h3>
                 <div className="bg-brand-gold/10 p-4 rounded border border-brand-gold/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <p className="text-xs text-gray-600 leading-relaxed max-w-sm">
                      Install "Once Upon" on your device. 
                      {deferredPrompt 
                        ? " Tap below to add to your home screen." 
                        : " If the button is disabled, the app might already be installed, or your browser (like Safari/Firefox) requires manual adding via the 'Share' menu."}
                    </p>
                    <button 
                      onClick={handleInstallClick}
                      disabled={!deferredPrompt}
                      className="bg-brand-gold text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[2px] hover:bg-brand-flamingo transition-colors whitespace-nowrap shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={14} /> 
                      {deferredPrompt ? "Download App" : "App Ready (or Installed)"}
                    </button>
                 </div>
               </div>

               <h3 className="font-serif text-xl text-gray-900 mb-6 flex items-center gap-3">
                 <Settings className="text-brand-gold" size={20} />
                 New Bucket Setup Guide
               </h3>
               
               <div className="space-y-6">
                 {/* Steps 1-4 */}
                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-brand-latte/20 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">1</div>
                   <div>
                     <h4 className="font-bold text-gray-900 text-sm mb-1">Create Bucket in Console</h4>
                     <p className="text-xs text-gray-500 leading-relaxed">
                       If you deleted your old bucket, go to Firebase Console {'>'} Storage. Click <strong>"Get Started"</strong>.
                     </p>
                     <p className="text-xs text-brand-flamingo font-bold mt-1">Choose "Start in Test Mode" if asked.</p>
                     <a href="https://console.firebase.google.com/project/once-upon-24709/storage" target="_blank" className="text-[10px] font-bold uppercase tracking-widest text-brand-flamingo hover:underline mt-2 inline-flex items-center gap-1">
                       Open Console <ExternalLink size={10} />
                     </a>
                   </div>
                 </div>

                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-brand-latte/20 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">2</div>
                   <div>
                     <h4 className="font-bold text-gray-900 text-sm mb-1">Get New URL</h4>
                     <p className="text-xs text-gray-500 leading-relaxed">
                       Copy the URL from the console (usually looks like <code>project-id.firebasestorage.app</code>).
                     </p>
                   </div>
                 </div>

                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-brand-latte/20 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">3</div>
                   <div>
                     <h4 className="font-bold text-gray-900 text-sm mb-1">Update Code</h4>
                     <p className="text-xs text-gray-500 leading-relaxed">
                       Open <code>firebase.ts</code> and update the <code>storageBucket</code> property with the new name.
                     </p>
                   </div>
                 </div>

                 <div className="flex gap-4">
                   <div className="w-8 h-8 rounded-full bg-brand-latte/20 flex items-center justify-center font-bold text-gray-600 flex-shrink-0">4</div>
                   <div>
                     <h4 className="font-bold text-gray-900 text-sm mb-1">Fix Rules</h4>
                     <p className="text-xs text-gray-500 leading-relaxed">
                       Ensure your Storage Rules allow reads and writes.
                     </p>
                     <div className="mt-2 bg-brand-grey/10 p-3 rounded font-mono text-[10px] text-gray-600">
                        allow read, write: if true;
                     </div>
                   </div>
                 </div>
               </div>

               {/* Diagnostic Tool */}
               <div className="mt-8 border-t border-brand-latte/20 pt-6">
                 <h4 className="font-bold text-gray-900 text-sm mb-4">Diagnostics</h4>
                 
                 <div className="bg-brand-grey/5 p-4 rounded border border-brand-latte/10">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Storage Connection</span>
                     {testResult === 'success' && <span className="text-brand-green text-xs font-bold flex items-center gap-1"><Check size={14}/> Connected</span>}
                     {testResult === 'fail' && <span className="text-red-500 text-xs font-bold flex items-center gap-1"><X size={14}/> Failed</span>}
                   </div>
                   
                   <p className="text-[10px] text-gray-400 mb-4">
                     Click below to attempt a tiny test upload. This will verify if your bucket is active and writable.
                   </p>
                   
                   <button 
                     onClick={handleConnectionTest}
                     disabled={isTesting}
                     className="bg-gray-900 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[2px] hover:bg-brand-flamingo transition-colors flex items-center gap-2"
                   >
                     {isTesting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                     Test Connection
                   </button>
                   
                   {testMessage && (
                     <div className={`mt-4 p-3 rounded text-xs border ${testResult === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                       {testMessage}
                     </div>
                   )}
                 </div>
               </div>

               {/* Danger Zone: Reset Order System */}
               <div className="mt-8 border-t border-brand-latte/20 pt-6">
                 <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2 text-red-500"><AlertTriangle size={16}/> Danger Zone</h4>
                 
                 <div className="bg-red-50 p-4 rounded border border-red-100">
                   <div className="flex items-center justify-between mb-3">
                     <span className="text-xs font-bold uppercase tracking-widest text-red-700">Reset Order IDs</span>
                   </div>
                   
                   <p className="text-[10px] text-red-600 mb-4 leading-relaxed">
                     Your current order IDs might be messy strings because they were created before the sequential logic (1000, 1001) was active. 
                     Use this to <strong>delete all current orders</strong> and reset the counter to start from 1000 again.
                   </p>
                   
                   <button 
                     onClick={handleResetOrders}
                     disabled={isResetting}
                     className="bg-red-600 text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-[2px] hover:bg-red-700 transition-colors flex items-center gap-2"
                   >
                     {isResetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                     Delete All Orders & Reset Counter
                   </button>
                 </div>
               </div>

             </div>
          </div>
        )}
      </div>
    </div>
  );
};
