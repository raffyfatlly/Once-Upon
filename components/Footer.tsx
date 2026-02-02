
import React from 'react';
import { Instagram, Heart, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onAdminClick?: () => void;
}

const WhatsappIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ onAdminClick }) => {
  return (
    <footer className="bg-white pt-20 pb-12 border-t border-brand-latte/20 relative">
      
      {/* Decorative Center Element */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4">
        <Heart size={16} className="text-brand-flamingo fill-brand-flamingo/20" />
      </div>

      <div className="container mx-auto px-6 max-w-6xl flex flex-col items-center">
        
        <div className="mb-10 text-center">
          <div className="font-serif text-3xl font-bold text-gray-900 tracking-wider mb-1">ONCE UPON</div>
          <div className="font-script text-xl text-brand-gold">Kuala Lumpur</div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12 items-center">
           <Link to="/" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Shop</Link>
           <Link to="/story" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Our Story</Link>
           <Link to="/collections/Blankets" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Collections</Link>
           <Link to="/orders" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Track Order</Link>
        </div>

        <div className="flex space-x-8 mb-12">
          <a 
            href="https://www.instagram.com/onceuponbysyahirahkasim/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-brand-latte hover:text-brand-flamingo transition-colors hover:-translate-y-1 duration-300"
          >
            <Instagram size={18} />
          </a>
          <a 
            href="https://wa.link/u3tgry" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-brand-latte hover:text-brand-flamingo transition-colors hover:-translate-y-1 duration-300"
          >
            <WhatsappIcon size={18} />
          </a>
        </div>

        <div className="text-center relative flex flex-col items-center w-full">
          <p className="font-sans text-[10px] text-gray-400 font-light tracking-wide mb-2">
            &copy; {new Date().getFullYear()} Once Upon. All rights reserved.
          </p>
          <p className="font-script text-lg text-brand-latte mb-8">
            Designed with Love
          </p>
          
          {/* Subtle Admin Icon */}
          {onAdminClick && (
            <button 
              onClick={onAdminClick}
              className="text-brand-latte/30 hover:text-brand-gold transition-colors p-2"
              aria-label="Admin Access"
            >
              <Lock size={12} />
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
