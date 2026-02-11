
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { ArrowLeft, Minus, Plus, ShoppingBag, Truck, Info, Leaf, Loader2, Check, AlertCircle, Ruler, Share2, Clock } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

interface ProductDetailsProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
}

const getProductSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; toggle: () => void }> = ({ title, children, isOpen, toggle }) => (
  <div className="border-b border-brand-latte/20">
    <button onClick={toggle} className="w-full py-4 flex items-center justify-between text-left group">
      <span className="font-sans text-xs font-bold uppercase tracking-widest text-gray-900 group-hover:text-brand-flamingo transition-colors">{title}</span>
      {isOpen ? <Minus size={14} className="text-brand-flamingo" /> : <Plus size={14} className="text-gray-400" />}
    </button>
    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-6' : 'max-h-0 opacity-0'}`}>
      <div className="font-sans text-sm text-gray-500 leading-relaxed font-light">
        {children}
      </div>
    </div>
  </div>
);

export const ProductDetails: React.FC<ProductDetailsProps> = ({ products, onAddToCart }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');

  const [openSection, setOpenSection] = useState<string>('material');
  const [quantity, setQuantity] = useState(1);
  const [addState, setAddState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (products.length > 0 && slug) {
      let found = products.find(p => getProductSlug(p.name) === slug);
      if (!found) {
        found = products.find(p => p.id === slug);
      }
      setProduct(found);
      if (found) setActiveImage(found.image);
      setLoading(false);
    } else if (products.length === 0) {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    } else {
        setLoading(false);
    }
  }, [slug, products]);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  const handleAddToCart = () => {
    if (addState !== 'idle' || !product) return;
    setAddState('loading');
    setTimeout(() => {
      onAddToCart(product, quantity);
      setAddState('success');
      setTimeout(() => {
        setAddState('idle');
      }, 2000);
    }, 600);
  };

  const handleShare = async () => {
    if (!product) return;
    const shareData = {
      title: product.name,
      text: `Check out ${product.name} on Once Upon`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log('Share canceled or failed'); }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
      } catch (err) { console.error('Failed to copy'); }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="animate-spin text-brand-latte" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-12">
        <AlertCircle size={48} className="text-brand-latte mb-4 opacity-50" />
        <h2 className="font-serif text-2xl text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">The item you are looking for does not exist.</p>
        <button onClick={() => navigate('/')} className="text-xs font-bold uppercase tracking-widest text-brand-flamingo hover:text-brand-gold">
          Return to Shop
        </button>
      </div>
    );
  }

  const galleryImages = [product.image, ...(product.additionalImages || [])];
  const stock = product.stock || 0;
  const isPreOrder = stock <= 0;
  const isLowStock = stock > 0 && stock <= 5;
  
  // If pre-order, quantity is effectively unlimited (or reasonable max), else capped by stock
  const maxQty = isPreOrder ? 100 : stock;

  return (
    <div className="min-h-screen bg-white animate-fade-in pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-6xl">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-brand-flamingo mb-8 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-sans text-[10px] uppercase tracking-widest font-bold">Back to Shop</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[3/4] bg-brand-grey/5 rounded-[2px] overflow-hidden group border border-brand-latte/10">
               {/* Removed grayscale here */}
               <img src={activeImage || product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
               {isPreOrder && (
                  // Made smaller on mobile (px-3 py-1.5 text-xs) and larger on desktop (md:px-6 md:py-3 md:text-xl)
                  <div className="absolute top-4 right-4 pointer-events-none">
                    <div className="px-3 py-1.5 md:px-6 md:py-3 bg-white/95 border border-brand-gold/30 rounded-full shadow-sm">
                      <span className="font-serif text-xs md:text-xl text-brand-gold font-bold uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} className="md:w-5 md:h-5" /> Pre-order
                      </span>
                    </div>
                  </div>
               )}
            </div>
            {galleryImages.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                 {galleryImages.map((img, i) => (
                   // Removed grayscale here as well
                   <div key={i} onClick={() => setActiveImage(img)} className={`aspect-square bg-brand-grey/10 cursor-pointer overflow-hidden rounded-[2px] border transition-all duration-300 ${activeImage === img ? 'border-brand-flamingo ring-1 ring-brand-flamingo/50' : 'border-transparent hover:border-brand-latte'}`}>
                     <img src={img} className={`w-full h-full object-cover transition-opacity duration-300 ${activeImage === img ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`} alt={`${product.name} view ${i + 1}`} />
                   </div>
                 ))}
              </div>
            )}
          </div>

          <div className="flex flex-col pt-4">
            <div className="flex justify-between items-start gap-4 mb-2">
               <h1 className="font-serif text-3xl md:text-4xl text-gray-900 leading-tight">{product.name}</h1>
               <button onClick={handleShare} className="mt-1 p-2 text-brand-latte hover:text-brand-flamingo hover:bg-brand-flamingo/5 rounded-full transition-all duration-300 relative group flex-shrink-0" aria-label="Share product">
                  <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest text-brand-green whitespace-nowrap pointer-events-none transition-all duration-300 ${shareStatus === 'copied' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>Link Copied</span>
                  {shareStatus === 'copied' ? (<Check size={20} className="text-brand-green" strokeWidth={1.5} />) : (<Share2 size={20} strokeWidth={1.5} />)}
               </button>
            </div>
            <div className="flex items-center gap-4 mb-8">
              <span className="font-serif text-2xl text-gray-900">RM {product.price}</span>
              <div className="h-4 w-[1px] bg-gray-200"></div>
              <span className="font-script text-xl text-brand-gold">{(!product.collection || product.collection === 'Blankets') ? 'Blanket Collection' : product.collection}</span>
            </div>
            <p className="font-serif italic text-gray-600 text-base leading-relaxed mb-8 border-l-2 border-brand-flamingo pl-6">"{product.description}"</p>

            <div className="flex flex-col gap-4 mb-12">
               <div className="flex flex-col sm:flex-row gap-4">
                 <div className="flex items-center border border-brand-latte/30 rounded-full h-12 w-full sm:w-32 px-4 justify-between bg-white">
                   <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-400 hover:text-brand-flamingo disabled:opacity-30"><Minus size={14}/></button>
                   <span className="font-sans font-bold text-sm text-gray-900">{quantity}</span>
                   <button onClick={() => setQuantity(Math.min(maxQty, quantity + 1))} className="text-gray-400 hover:text-brand-flamingo disabled:opacity-30" disabled={quantity >= maxQty}><Plus size={14}/></button>
                 </div>
                 <button onClick={handleAddToCart} disabled={addState !== 'idle'} className={`w-full sm:flex-1 h-12 rounded-full flex items-center justify-center gap-3 transition-all duration-300 font-sans text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg ${addState === 'success' ? 'bg-brand-green text-white hover:bg-brand-green/90 shadow-brand-green/20' : isPreOrder ? 'bg-brand-gold text-white hover:bg-brand-flamingo shadow-brand-gold/20' : 'bg-brand-flamingo text-white hover:bg-brand-gold shadow-brand-flamingo/20'}`}>
                   {addState === 'loading' ? (<Loader2 size={16} className="animate-spin" />) : addState === 'success' ? (<><Check size={16} />Added</>) : isPreOrder ? (<><Clock size={16} strokeWidth={1.5} />Pre-order Item</>) : (<><ShoppingBag size={16} strokeWidth={1.5} />Add to Bag</>)}
                 </button>
               </div>
               
               {isPreOrder ? (
                 <div className="flex items-start gap-3 text-brand-gold bg-brand-gold/5 p-4 rounded-[2px] border border-brand-gold/10">
                   <Clock size={18} className="mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-bold text-xs uppercase tracking-wider mb-1">Item Sold Out</p>
                     <p className="font-serif italic text-sm text-gray-600">This item is available for <strong>pre-order</strong>. It is currently crafting and will ship in approximately <strong>2 weeks</strong>.</p>
                   </div>
                 </div>
               ) : isLowStock && (
                 <div className="flex items-center gap-2 text-brand-flamingo animate-pulse">
                   <AlertCircle size={14} />
                   <span className="font-serif italic text-sm">Hurry! Only {stock} left in stock.</span>
                 </div>
               )}
            </div>

            <div className="mt-auto">
              <AccordionItem title="Material & Composition" isOpen={openSection === 'material'} toggle={() => toggleSection('material')}>
                <div className="flex items-start gap-3"><Leaf size={16} className="text-brand-latte mt-1 flex-shrink-0" /><p>{product.material || 'Premium ethically sourced fibers.'}</p></div>
              </AccordionItem>
              <AccordionItem title="Dimensions" isOpen={openSection === 'size'} toggle={() => toggleSection('size')}>
                <div className="flex items-start gap-3"><Ruler size={16} className="text-brand-latte mt-1 flex-shrink-0" /><p>{product.size || 'One size fits most.'}</p></div>
              </AccordionItem>
              <AccordionItem title="Care Instructions" isOpen={openSection === 'care'} toggle={() => toggleSection('care')}>
                <div className="flex items-start gap-3"><Info size={16} className="text-brand-latte mt-1 flex-shrink-0" /><p>{product.care || 'Gentle hand wash recommended to preserve the softness of the fibers.'}</p></div>
              </AccordionItem>
              <AccordionItem title="Shipping & Returns" isOpen={openSection === 'shipping'} toggle={() => toggleSection('shipping')}>
                 <div className="flex items-start gap-3"><Truck size={16} className="text-brand-latte mt-1 flex-shrink-0" /><div className="flex flex-col gap-3"><p>Delivery to West Malaysia is available at a flat rate of RM 8.00. For larger orders containing three (3) or more items, a standard shipping fee of RM 10.00 applies. </p><p>Shipping to East Malaysia (Sabah & Sarawak) is charged at RM 12.00.</p><p className="italic text-brand-gold">Please kindly note that all sales are final. We are unable to accept returns or exchanges.</p></div></div>
              </AccordionItem>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
