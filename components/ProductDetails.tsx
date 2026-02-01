
import React, { useState } from 'react';
import { Product } from '../types';
import { ArrowLeft, Minus, Plus, ShoppingBag, Truck, Info, Leaf, Heart, Loader2, Check } from 'lucide-react';

interface ProductDetailsProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  onBack: () => void;
}

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

export const ProductDetails: React.FC<ProductDetailsProps> = ({ product, onAddToCart, onBack }) => {
  const [openSection, setOpenSection] = useState<string>('material');
  const [quantity, setQuantity] = useState(1);
  const [addState, setAddState] = useState<'idle' | 'loading' | 'success'>('idle');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  const handleAddToCart = () => {
    if (addState !== 'idle') return;
    setAddState('loading');
    
    // Simulate network delay for better UX
    setTimeout(() => {
      onAddToCart(product, quantity);
      setAddState('success');
      
      // Reset after showing success
      setTimeout(() => {
        setAddState('idle');
      }, 2000);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-white animate-fade-in pt-24 pb-12">
      <div className="container mx-auto px-6 max-w-6xl">
        
        {/* Breadcrumb / Back */}
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-brand-flamingo mb-8 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-sans text-[10px] uppercase tracking-widest font-bold">Back to Shop</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* Left: Imagery */}
          <div className="flex flex-col gap-6">
            <div className="relative aspect-[3/4] bg-brand-grey/5 rounded-[2px] overflow-hidden">
               <img 
                 src={product.image} 
                 alt={product.name} 
                 className="w-full h-full object-cover"
               />
            </div>
            {/* Mock Thumbnails */}
            <div className="grid grid-cols-4 gap-4">
               {[1,2,3].map((_, i) => (
                 <div key={i} className={`aspect-square bg-brand-grey/10 cursor-pointer border ${i === 0 ? 'border-brand-flamingo' : 'border-transparent'} hover:border-brand-latte transition-colors`}>
                   <img src={product.image} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                 </div>
               ))}
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col pt-4">
            <h1 className="font-serif text-3xl md:text-4xl text-gray-900 mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-8">
              <span className="font-serif text-2xl text-gray-900">RM {product.price}</span>
              <div className="h-4 w-[1px] bg-gray-200"></div>
              <div className="flex gap-0.5">
                 {[1,2,3,4,5].map(i => <Heart key={i} size={12} className="fill-brand-pink text-brand-pink" />)}
              </div>
            </div>

            <p className="font-serif italic text-gray-600 text-base leading-relaxed mb-8 border-l-2 border-brand-flamingo pl-6">
              "{product.description}"
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
               <div className="flex items-center border border-brand-latte/30 rounded-full h-12 w-full sm:w-32 px-4 justify-between">
                 <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-gray-400 hover:text-brand-flamingo"><Minus size={14}/></button>
                 <span className="font-sans font-bold text-sm text-gray-900">{quantity}</span>
                 <button onClick={() => setQuantity(quantity + 1)} className="text-gray-400 hover:text-brand-flamingo"><Plus size={14}/></button>
               </div>
               
               <button 
                 onClick={handleAddToCart}
                 disabled={addState !== 'idle'}
                 className={`w-full sm:flex-1 h-12 rounded-full flex items-center justify-center gap-3 transition-all duration-300 font-sans text-[11px] uppercase tracking-[0.2em] font-bold shadow-lg 
                   ${addState === 'success' 
                      ? 'bg-brand-green text-white hover:bg-brand-green/90 shadow-brand-green/20' 
                      : 'bg-brand-flamingo text-white hover:bg-brand-gold shadow-brand-flamingo/20'
                   }`}
                >
                 {addState === 'loading' ? (
                   <Loader2 size={16} className="animate-spin" />
                 ) : addState === 'success' ? (
                   <>
                     <Check size={16} />
                     Added
                   </>
                 ) : (
                   <>
                     <ShoppingBag size={16} strokeWidth={1.5} />
                     Add to Bag
                   </>
                 )}
               </button>
            </div>

            {/* Info Accordions */}
            <div className="mt-auto">
              <AccordionItem 
                title="Material & Composition" 
                isOpen={openSection === 'material'} 
                toggle={() => toggleSection('material')}
              >
                <div className="flex items-start gap-3">
                   <Leaf size={16} className="text-brand-latte mt-1 flex-shrink-0" />
                   <p>{product.material || 'Premium ethically sourced fibers.'}</p>
                </div>
              </AccordionItem>
              
              <AccordionItem 
                title="Care Instructions" 
                isOpen={openSection === 'care'} 
                toggle={() => toggleSection('care')}
              >
                <div className="flex items-start gap-3">
                   <Info size={16} className="text-brand-latte mt-1 flex-shrink-0" />
                   <p>{product.care || 'Gentle hand wash recommended to preserve the softness of the fibers.'}</p>
                </div>
              </AccordionItem>
              
              <AccordionItem 
                title="Shipping & Returns" 
                isOpen={openSection === 'shipping'} 
                toggle={() => toggleSection('shipping')}
              >
                 <div className="flex items-start gap-3">
                   <Truck size={16} className="text-brand-latte mt-1 flex-shrink-0" />
                   <div className="flex flex-col gap-3">
                     <p>Delivery to West Malaysia is available at a flat rate of RM 8.00. For larger orders containing three (3) or more items, a standard shipping fee of RM 10.00 applies. </p>
                     <p>Shipping to East Malaysia (Sabah & Sarawak) is charged at RM 12.00.</p>
                     <p className="italic text-brand-gold">Please kindly note that all sales are final. We are unable to accept returns or exchanges.</p>
                   </div>
                </div>
              </AccordionItem>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
