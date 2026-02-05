
import React from 'react';
import { Instagram, Heart, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface FooterProps {
  onAdminClick?: () => void;
}

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
        
        {/* Main Nav Links */}
        <div className="flex flex-wrap justify-center gap-8 md:gap-12 mb-12 items-center">
           <Link to="/" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Shop</Link>
           <Link to="/story" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Our Story</Link>
           <Link to="/collections/Blankets" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Collections</Link>
           <Link to="/orders" className="font-sans text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-brand-flamingo transition-colors font-bold">Track Order</Link>
        </div>

        <div className="text-center relative flex flex-col items-center w-full">
          <p className="font-sans text-[10px] text-gray-400 font-light tracking-wide mb-4">
            &copy; {new Date().getFullYear()} Once Upon. All rights reserved.
          </p>

          {/* Policy Links Moved Here */}
          {/* Use smaller font (text-[7px]) and tighter tracking on mobile to ensure one-line fit */}
          <div className="flex flex-nowrap justify-center gap-2 md:gap-6 mb-8 items-center w-full overflow-x-auto hide-scrollbar px-2 md:px-4">
             <Link to="/policies/refund" className="font-sans text-[7px] md:text-[9px] uppercase tracking-wider md:tracking-[0.15em] text-gray-400 hover:text-brand-flamingo transition-colors whitespace-nowrap">Refund Policy</Link>
             <span className="text-[7px] md:text-[9px] text-gray-300 font-light">|</span>
             <Link to="/policies/shipping" className="font-sans text-[7px] md:text-[9px] uppercase tracking-wider md:tracking-[0.15em] text-gray-400 hover:text-brand-flamingo transition-colors whitespace-nowrap">Shipping Info</Link>
             <span className="text-[7px] md:text-[9px] text-gray-300 font-light">|</span>
             <Link to="/policies/privacy" className="font-sans text-[7px] md:text-[9px] uppercase tracking-wider md:tracking-[0.15em] text-gray-400 hover:text-brand-flamingo transition-colors whitespace-nowrap">Privacy Policy</Link>
             <span className="text-[7px] md:text-[9px] text-gray-300 font-light">|</span>
             <Link to="/policies/terms" className="font-sans text-[7px] md:text-[9px] uppercase tracking-wider md:tracking-[0.15em] text-gray-400 hover:text-brand-flamingo transition-colors whitespace-nowrap">Terms of Service</Link>
          </div>

          <p className="font-script text-lg text-brand-latte mb-8">
            Designed with Love
          </p>
          
          {/* Contact Details & Business Registration */}
          <div className="flex flex-col items-center gap-3 mb-8 border-t border-brand-latte/10 pt-6 w-full max-w-md">
             <div className="text-center space-y-3">
                <div className="font-sans text-[9px] text-gray-400 tracking-widest leading-relaxed px-4">
                  <p className="mb-1 font-medium">Vanillicious Enterprise (202303157333 (003504071-D))</p>
                  <p>A-G-01, PV2 Platinum Hill, Jalan Taman Melati 1, 53100 Kuala Lumpur.</p>
                </div>
             </div>
          </div>
          
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
