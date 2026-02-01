
import React, { useState } from 'react';
import { Product } from '../types';
import { ShoppingBag, Sparkles, Loader2, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  onClick: (product: Product) => void;
  index: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, onClick, index }) => {
  const isEven = index % 2 === 0;
  const [addState, setAddState] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addState !== 'idle') return;
    
    setAddState('loading');
    setTimeout(() => {
      onAddToCart(product, 1);
      setAddState('success');
      setTimeout(() => setAddState('idle'), 2000);
    }, 600);
  };

  return (
    <div className={`group relative w-full flex flex-col items-center ${isEven ? 'md:mt-0' : 'md:mt-32'}`}>
      
      {/* "Cute" Frame Container - Clickable */}
      <div 
        onClick={() => onClick(product)}
        className="relative w-full aspect-[3/4] mx-auto max-w-sm transition-transform duration-500 hover:-translate-y-2 cursor-pointer"
      >
        
        {/* 1. Backing decorative layer */}
        <div className="absolute top-4 -right-4 w-full h-full bg-brand-latte/20 rounded-[30px] -rotate-2 transition-transform duration-500 group-hover:rotate-0 group-hover:translate-x-2 group-hover:translate-y-2"></div>
        
        {/* 2. Second backing layer */}
        <div className="absolute -bottom-4 -left-4 w-full h-full bg-brand-pink/10 rounded-[30px] rotate-2 transition-transform duration-500 group-hover:rotate-0 group-hover:-translate-x-2 group-hover:-translate-y-2"></div>

        {/* 3. Main Image Container */}
        <div className="relative w-full h-full bg-white rounded-[24px] overflow-hidden shadow-2xl shadow-brand-latte/10 ring-1 ring-black/5 flex flex-col">
           
           {/* The Image Matting */}
           <div className="w-full h-full overflow-hidden p-3 bg-white">
              <div className="w-full h-full overflow-hidden rounded-[16px] relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-[1.5s] ease-in-out group-hover:scale-110"
                />
                
                {/* Subtle sheen overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
              </div>
           </div>

           {/* Desktop Floating Action Button */}
           <div className="absolute bottom-5 right-5 z-30 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
             <button 
                onClick={handleAddToCart}
                disabled={addState !== 'idle'}
                className={`p-4 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center group/btn
                  ${addState === 'success' ? 'bg-brand-green text-white' : 'bg-brand-flamingo text-white hover:bg-brand-gold'}
                `}
                aria-label="Add to cart"
             >
               {addState === 'loading' ? (
                 <Loader2 size={20} className="animate-spin" />
               ) : addState === 'success' ? (
                 <Check size={20} strokeWidth={2} />
               ) : (
                 <ShoppingBag size={20} strokeWidth={1.5} className="group-hover/btn:animate-bounce" />
               )}
             </button>
           </div>
        </div>
      </div>

      {/* Product Details - Clickable Title */}
      <div 
        className="mt-10 text-center px-4 relative z-10 cursor-pointer"
        onClick={() => onClick(product)}
      >
        <h3 className="font-serif text-3xl text-gray-900 mb-2 group-hover:text-brand-flamingo transition-colors duration-300">
          {product.name}
        </h3>
        <p className="font-script text-2xl text-brand-gold mb-4 -mt-1 flex items-center justify-center gap-2">
          <Sparkles size={12} className="opacity-50" />
          {(!product.collection || product.collection === 'Blankets') ? 'Blanket Collection' : product.collection}
          <Sparkles size={12} className="opacity-50" />
        </p>
        
        <div className="flex flex-col items-center gap-3">
          <p className="font-sans text-gray-500 text-xs leading-relaxed max-w-[280px] font-light tracking-wide">
            {product.description}
          </p>
          
          <div className="mt-3 inline-block px-6 py-2 rounded-full border border-brand-latte/30 bg-white shadow-sm group-hover:border-brand-flamingo/30 transition-colors">
            <span className="font-sans font-bold text-sm tracking-widest text-gray-900">
              RM {product.price}
            </span>
          </div>
        </div>
      </div>
      
       {/* Mobile-only Button */}
       <button 
         onClick={handleAddToCart}
         disabled={addState !== 'idle'}
         className={`md:hidden mt-8 w-full max-w-xs text-white font-sans uppercase tracking-[0.2em] text-[10px] font-bold py-4 rounded-full shadow-lg transition-all flex items-center justify-center gap-3
           ${addState === 'success' ? 'bg-brand-green' : 'bg-brand-flamingo active:bg-brand-gold'}
         `}
      >
        {addState === 'loading' ? (
           <Loader2 size={14} className="animate-spin" />
        ) : addState === 'success' ? (
           <><span>Added</span> <Check size={14} /></>
        ) : (
           <><span>Add to Bag</span> <ShoppingBag size={14} /></>
        )}
      </button>

    </div>
  );
};
