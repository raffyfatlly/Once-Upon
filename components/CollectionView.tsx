
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../types';
import { ProductCard } from './ProductCard';
import { AlertCircle, Star } from 'lucide-react';

interface CollectionViewProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
}

// Helper for SEO URLs (can be imported, keeping here for file consistency)
const getProductSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

const SectionDivider = () => (
  <div className="flex items-center justify-center gap-4 py-8 opacity-40">
    <div className="h-[1px] w-12 md:w-24 bg-brand-latte"></div>
    <Star size={12} className="text-brand-latte" />
    <div className="h-[1px] w-12 md:w-24 bg-brand-latte"></div>
  </div>
);

export const CollectionView: React.FC<CollectionViewProps> = ({ products, onAddToCart }) => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const collectionName = name ? decodeURIComponent(name) : '';

  const filteredProducts = products.filter(p => (p.collection || 'Blankets') === collectionName);

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 animate-fade-in">
       {/* Simple Elegant Header */}
       <div className="bg-brand-grey/5 py-16 md:py-24 mb-12 relative overflow-hidden">
          <div className="absolute inset-0 scallop-border opacity-10 rotate-180 top-auto bottom-0"></div>
          
          <div className="container mx-auto px-6 text-center">
            <span className="font-script text-3xl md:text-4xl text-brand-gold mb-2 block animate-fade-in">
               Our Collection
            </span>
            <h1 className="font-serif text-4xl md:text-6xl text-gray-900 mb-6 leading-tight">
               {collectionName}
            </h1>
            <div className="w-16 h-[1px] bg-brand-flamingo mx-auto my-6"></div>
          </div>
       </div>

       <div className="container mx-auto px-6 max-w-6xl">
          {filteredProducts.length === 0 ? (
             <div className="text-center text-gray-400 font-sans text-sm italic py-20 bg-brand-grey/5 rounded-lg border border-dashed border-brand-latte/30">
               <div className="flex flex-col items-center gap-2">
                 <AlertCircle className="text-brand-latte" />
                 <p>No products found in this collection.</p>
                 <button onClick={() => navigate('/')} className="mt-4 text-brand-flamingo font-bold uppercase tracking-widest text-xs hover:text-brand-gold">
                   Return to Shop
                 </button>
               </div>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24 items-start px-4 md:px-0">
              {filteredProducts.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={(p, qty) => onAddToCart(p, qty)}
                  onClick={(p) => navigate(`/product/${getProductSlug(p.name)}`)}
                  index={index}
                />
              ))}
            </div>
          )}
       </div>
       
       <div className="py-20">
          <SectionDivider />
       </div>
    </div>
  );
};
