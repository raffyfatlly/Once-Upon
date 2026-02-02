
import React, { useState, useRef } from 'react';
import { Product, SiteConfig, Order } from '../types';
import { Trash2, Edit2, Plus, Image as ImageIcon, LogOut, Save, Search, User, Package, Calendar, Menu, Upload, X, Loader2, Check, Link, Database, AlertTriangle, ShieldAlert, Phone, Filter } from 'lucide-react';
import { addProductToDb, updateProductInDb, deleteProductFromDb, updateOrderStatusInDb, deleteOrderFromDb, uploadImage } from '../firebase';

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
  const [activeTab, setActiveTab] = useState<'products' | 'sales' | 'settings'>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'uploading' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  
  // Sales Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [deleteOrderConfirmation, setDeleteOrderConfirmation] = useState<string | null>(null);

  // Refs for file inputs
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const [newAdditionalUrl, setNewAdditionalUrl] = useState('');

  // Derive unique collections from existing products for autocomplete
  const existingCollections = Array.from(new Set(products.map(p => p.collection || 'Blankets'))).sort();

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
    collection: 'Blankets'
  });

  const handleEdit = (product: Product) => {
    setFormData({
        ...product,
        collection: product.collection || 'Blankets',
        additionalImages: product.additionalImages || []
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
      collection: 'Blankets'
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
      
      if (msg.includes("permission-denied") || msg.includes("Missing or insufficient permissions")) {
        alert("PERMISSION DENIED: You cannot delete items.\n\nPlease check your Firebase Firestore Rules. For development, allow read/write access.");
      } else {
        alert("Failed to delete product: " + msg);
      }
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
      alert("Failed to delete order. Permission denied or error.");
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
        additionalImages: []
      },
      {
        name: 'The Parisian Flight',
        price: 145,
        description: 'Vintage hot air balloons drifting over Parisian rooftops. A delicate blend of organic cotton and silk, finished with a refined latte border.',
        image: 'https://i.postimg.cc/cCSNXQ23/Gemini-Generated-Image-tit282tit282tit2.png',
        material: '80% Organic Cotton, 20% Mulberry Silk',
        care: 'Machine wash delicate cycle in laundry bag. Tumble dry low.',
        collection: 'Blankets',
        additionalImages: []
      },
      {
        name: 'The Enchanted Forest',
        price: 165,
        description: 'Deep forest greens and soft fawns create a magical woodland scene. Perfect for the adventurous little dreamer.',
        image: 'https://i.postimg.cc/vHk8yW1b/Gemini-Generated-Image-ux3s8aux3s8aux3s.png',
        material: '100% Organic Cotton Knit',
        care: 'Machine wash cold. Tumble dry low.',
        collection: 'Blankets',
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
      const msg = error.message || "Unknown error";
      if (msg.includes("Database not connected")) {
        alert("Error: Database not connected. Please check your firebase.ts configuration.");
      } else {
        alert(`Error uploading data: ${msg}`);
      }
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
        console.error(error);
        setSaveStatus('error');
        setErrorMessage("Image upload failed. Check Firebase Storage permissions.");
        alert("Upload Failed. Did you enable Firebase Storage in the console?");
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

  // Filter Orders Logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.includes(searchQuery) ||
      (order.customerPhone && order.customerPhone.includes(searchQuery));
      
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

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
              onClick={() => setActiveTab('settings')}
              className={`text-xs uppercase tracking-widest font-bold transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === 'settings' ? 'text-brand-flamingo' : 'text-gray-400'}`}
            >
              Settings
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
                    
                    {/* Collection Input */}
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
                      <p className="text-[10px] text-gray-400 mt-1">Select an existing collection or type a new one.</p>
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
                    <div>
                       <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Material</label>
                       <input className="w-full border p-3 text-sm focus:border-brand-flamingo outline-none bg-brand-grey/5" value={formData.material || ''} onChange={e => setFormData({...formData, material: e.target.value})} />
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
                        
                        <div className="flex items-start gap-4 p-4 border border-dashed border-brand-latte/30 bg-brand-grey/5 rounded-[2px]">
                           {formData.image ? (
                             <img src={formData.image} alt="Preview" className="w-20 h-28 object-cover border border-brand-latte/30 bg-white" />
                           ) : (
                             <div className="w-20 h-28 bg-brand-latte/10 flex items-center justify-center text-gray-400 text-xs text-center border border-brand-latte/20">No Image</div>
                           )}
                           <div>
                             <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Preview & Tips</p>
                             <p className="text-[10px] text-gray-400 leading-relaxed max-w-xs">
                               Recommended Size: <strong className="text-gray-600">600x800 px</strong> (Portrait 3:4 Aspect Ratio).
                               <br/>
                               Supported: JPG, PNG, WebP.
                             </p>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Images Section */}
                    <div className="border-t border-brand-latte/20 pt-6 mt-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Gallery Images (Optional)</label>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-4">
                         {/* Existing Additional Images */}
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

                    {errorMessage && (
                      <div className="bg-red-50 text-red-500 text-xs p-3 rounded flex items-center gap-2">
                        <AlertTriangle size={14} /> {errorMessage}
                      </div>
                    )}

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
                {products.length === 0 && (
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
                {products.map(product => (
                  <div key={product.id} className="bg-white border border-brand-latte/20 p-4 flex gap-4 items-center group rounded-[2px] shadow-sm">
                    <img src={product.image} alt={product.name} className="w-16 h-16 md:w-20 md:h-20 object-cover bg-gray-100 rounded-[2px]" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-base md:text-lg text-gray-900 leading-tight mb-1 truncate">{product.name}</h4>
                      <div className="flex flex-col">
                        <p className="text-brand-gold font-script text-base md:text-lg">RM {product.price}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <p className="text-[10px] text-gray-400 uppercase tracking-widest">{product.collection || 'Blankets'}</p>
                           {product.additionalImages && product.additionalImages.length > 0 && (
                             <span className="text-[10px] text-brand-flamingo bg-brand-pink/10 px-1.5 py-0.5 rounded" title={`${product.additionalImages.length} extra images`}>
                               +{product.additionalImages.length} img
                             </span>
                           )}
                        </div>
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

        {/* SALES TAB */}
        {activeTab === 'sales' && (
           <div className="animate-fade-in">
             {/* ... existing sales tab content ... */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <div>
                 <h2 className="font-serif text-2xl md:text-3xl text-gray-900">Sales & Customers</h2>
                 <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Manage orders and check status</p>
               </div>
               
               <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                 {/* Status Filter */}
                 <div className="relative">
                   <select 
                     value={filterStatus}
                     onChange={(e) => setFilterStatus(e.target.value)}
                     className="appearance-none bg-white border border-brand-latte/30 px-4 py-3 pr-10 rounded-full text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-brand-flamingo text-gray-600 w-full md:w-40"
                   >
                     <option value="all">All Status</option>
                     {ORDER_STATUSES.map(status => (
                       <option key={status} value={status}>{status}</option>
                     ))}
                   </select>
                   <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                 </div>

                 {/* Search */}
                 <div className="relative flex-1 md:w-64">
                   <input 
                     type="text" 
                     placeholder="Search order #, email..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-10 pr-4 py-3 bg-white border border-brand-latte/30 focus:border-brand-flamingo outline-none text-sm rounded-full shadow-sm"
                   />
                   <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                 </div>
               </div>
             </div>

             {filteredOrders.length === 0 ? (
               <div className="text-center py-24 bg-white border border-dashed border-brand-latte/30 rounded-[2px]">
                 <Package size={32} className="mx-auto text-brand-latte mb-3 opacity-50" />
                 <p className="text-gray-400 text-sm">No orders found.</p>
                 {(searchQuery || filterStatus !== 'all') && (
                   <button 
                    onClick={() => {setSearchQuery(''); setFilterStatus('all');}} 
                    className="text-brand-flamingo text-xs font-bold uppercase mt-2 hover:underline"
                   >
                     Clear Filters
                   </button>
                 )}
               </div>
             ) : (
               <div className="bg-white border border-brand-latte/20 rounded-[2px] shadow-sm overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse min-w-[800px]">
                     <thead>
                       <tr className="bg-brand-grey/10 border-b border-brand-latte/20">
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Order ID / Date</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Customer</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Items</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">Status</th>
                         <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-16">Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredOrders.map(order => (
                         <tr key={order.id} className="border-b border-brand-latte/10 hover:bg-brand-grey/5 transition-colors">
                           <td className="p-4">
                             <div className="font-mono text-xs text-gray-400">#{order.id.slice(-6)}</div>
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
                                 <div className="text-[10px] text-gray-400 mt-1 max-w-[150px] leading-tight text-gray-500">{order.shippingAddress}</div>
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
                             <button 
                                onClick={() => handleOrderDeleteClick(order.id)}
                                disabled={deletingOrderId === order.id}
                                className={`p-2 rounded-full transition-all ${
                                  deleteOrderConfirmation === order.id 
                                  ? 'bg-red-50 text-red-500 ring-1 ring-red-200 w-full text-[10px] font-bold' 
                                  : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                                }`}
                                title="Delete Order"
                             >
                               {deletingOrderId === order.id ? (
                                 <Loader2 size={14} className="animate-spin mx-auto" />
                               ) : deleteOrderConfirmation === order.id ? (
                                 "Confirm?"
                               ) : (
                                 <Trash2 size={16} />
                               )}
                             </button>
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
               <h3 className="font-serif text-xl text-gray-900 mb-6 flex items-center gap-3">
                 <ShieldAlert className="text-brand-gold" size={20} />
                 Firebase Configuration
               </h3>
               {/* ... existing settings content ... */}
               <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                 To enable full functionality (adding/deleting products and images), you must configure your Firebase Security Rules in the Firebase Console.
               </p>

               <div className="bg-brand-grey/10 p-4 rounded border border-brand-latte/20 font-mono text-xs text-gray-700 overflow-x-auto">
                 <p className="text-gray-400 mb-2">// firestore.rules</p>
                 <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // WARNING: Allow all read/write for development only
      allow read, write: if true; 
    }
  }
}`}</pre>
               </div>
               
               <div className="mt-4 bg-brand-grey/10 p-4 rounded border border-brand-latte/20 font-mono text-xs text-gray-700 overflow-x-auto">
                 <p className="text-gray-400 mb-2">// storage.rules</p>
                 <pre>{`rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // WARNING: Allow all read/write for development only
      allow read, write: if true;
    }
  }
}`}</pre>
               </div>

               <div className="mt-6 flex items-start gap-3 text-amber-600 bg-amber-50 p-4 rounded text-xs">
                 <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                 <p>
                   <strong>Note:</strong> Setting rules to "true" allows anyone to read/write to your database. 
                   Before launching to production, you must restrict these rules to authenticated users only.
                 </p>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
