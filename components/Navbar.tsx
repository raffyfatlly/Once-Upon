
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Menu, X, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { NAVIGATION_LINKS } from '../constants';

interface NavbarProps {
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const prevCartCount = useRef(cartCount);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setAnimateCart(true);
      const timer = setTimeout(() => setAnimateCart(false), 800);
      return () => clearTimeout(timer);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'bg-white/95 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.03)] py-3' : 'bg-transparent py-6'
        }`}
      >
        <div className="container mx-auto px-6 max-w-7xl flex items-center justify-between">
          
          {/* Mobile Toggle */}
          <button 
            className="md:hidden text-gray-800 p-2 -ml-2 hover:text-brand-flamingo transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} strokeWidth={1} />
          </button>

          {/* Desktop Left Links */}
          <div className="hidden md:flex space-x-10 items-center flex-1">
             <Link to="/" className="font-sans text-[10px] tracking-[0.15em] text-gray-500 hover:text-brand-flamingo transition-colors uppercase font-bold">Shop</Link>
             <a href="#story" className="font-sans text-[10px] tracking-[0.15em] text-gray-500 hover:text-brand-flamingo transition-colors uppercase font-bold">Story</a>
          </div>

          {/* Logo */}
          <div className="flex-none text-center group cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl md:text-3xl tracking-[0.1em] text-gray-900 font-bold group-hover:text-brand-flamingo transition-colors duration-500">
                ONCE UPON
              </span>
              <span className={`font-script text-xl text-brand-gold -mt-1 transition-all duration-500 ${isScrolled ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
                Kuala Lumpur
              </span>
            </div>
          </div>

          {/* Desktop Right Links / Cart */}
          <div className="hidden md:flex space-x-10 items-center flex-1 justify-end">
             <a href="#collections" className="font-sans text-[10px] tracking-[0.15em] text-gray-500 hover:text-brand-flamingo transition-colors uppercase font-bold">Collections</a>
             <Link 
                to="/cart"
                className={`relative cursor-pointer group/cart transition-colors duration-300 ${animateCart ? 'text-brand-flamingo animate-cart-alert' : 'text-gray-800 hover:text-brand-flamingo'}`}
             >
                <ShoppingBag size={18} strokeWidth={1.5} className="group-hover/cart:fill-brand-flamingo/10 transition-colors" />
                {cartCount > 0 && (
                  <span className={`absolute -top-1 -right-1 bg-brand-flamingo text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full transition-transform duration-300 ${animateCart ? 'scale-110' : 'scale-100'}`}>
                    {cartCount}
                  </span>
                )}
             </Link>
          </div>

          {/* Mobile Cart */}
          <Link 
            to="/cart"
            className={`md:hidden relative cursor-pointer p-2 -mr-2 transition-colors duration-300 ${animateCart ? 'text-brand-flamingo animate-cart-alert' : 'text-gray-800'}`}
          >
            <ShoppingBag size={22} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-brand-flamingo text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div 
        className={`fixed inset-0 bg-[#FFFDF9] z-[60] flex flex-col transition-all duration-700 cubic-bezier(0.7, 0, 0.3, 1) md:hidden ${
          isMobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-paper opacity-50 pointer-events-none"></div>
        <div className="absolute inset-0 border-[12px] border-double border-brand-grey pointer-events-none"></div>

        <div className="relative flex items-center justify-between px-6 py-6">
          <span className="font-serif text-xl tracking-widest text-gray-900 font-bold">MENU</span>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 text-gray-800 hover:rotate-90 transition-transform duration-500"
          >
            <X size={28} strokeWidth={1} />
          </button>
        </div>
        
        <div className="flex-1 flex flex-col justify-center items-center space-y-10 relative">
          <Star className="text-brand-latte/30 w-12 h-12 absolute top-10 right-10 animate-spin-slow" />
          
          <Link 
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="font-serif text-3xl text-gray-900 hover:text-brand-flamingo hover:italic transition-all duration-300"
          >
            Shop
          </Link>
          
          {NAVIGATION_LINKS.filter(l => l.name !== 'Shop').map((link, idx) => (
            <a 
              key={link.name} 
              href={link.href}
              className={`font-serif text-3xl text-gray-900 hover:text-brand-flamingo hover:italic transition-all duration-300 ${
                isMobileMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}
              style={{ transitionDelay: `${idx * 150}ms` }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </a>
          ))}
        </div>
        
        <div className="p-10 text-center">
          <p className="font-script text-2xl text-brand-gold">
            With Love, KL
          </p>
        </div>
      </div>
    </>
  );
};
