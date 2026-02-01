
import React from 'react';
import { Star, Sparkles } from 'lucide-react';

interface HeroProps {
  backgroundImage?: string;
  onEnterShop?: () => void;
}

const CloudSVG = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 500 200" 
    className={className} 
    preserveAspectRatio="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <filter id="elegant-shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
        <feOffset dx="0" dy="4" result="offsetblur" />
        <feFlood floodColor="#D9C4B8" floodOpacity="0.15" />
        <feComposite in2="offsetblur" operator="in" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Smoother, more abstract cloud shape */}
    <path 
      d="M110.5 105.5C110.5 75.5 150.5 60.5 180.5 80.5C200.5 55.5 280.5 45.5 310.5 75.5C330.5 65.5 380.5 75.5 380.5 105.5C380.5 135.5 340.5 145.5 310.5 135.5C290.5 155.5 210.5 155.5 190.5 135.5C160.5 145.5 110.5 135.5 110.5 105.5Z" 
      fill="white" 
      fillOpacity="0.95"
      filter="url(#elegant-shadow)"
    />
  </svg>
);

const FairyTaleCastle = ({ size = 24, className, strokeWidth = 1.5 }: { size?: number, className?: string, strokeWidth?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 64 64" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    stroke="currentColor"
  >
    <path d="M32 14V48" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M24 24L32 14L40 24" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="24" y="24" width="16" height="24" strokeWidth={strokeWidth} strokeLinejoin="round"/>
    
    <path d="M12 28L20 20L28 28" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="12" y="28" width="12" height="20" strokeWidth={strokeWidth} strokeLinejoin="round"/>
    
    <path d="M36 28L44 20L52 28" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="40" y="28" width="12" height="20" strokeWidth={strokeWidth} strokeLinejoin="round"/>

    <path d="M8 48H56" strokeWidth={strokeWidth} strokeLinecap="round"/>
    
    <path d="M28 48V38C28 35.79 29.79 34 32 34C34.21 34 36 35.79 36 38V48" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 34V48" strokeWidth={Math.max(1, strokeWidth - 0.5)} strokeLinecap="round"/>

    <path d="M32 14V8L38 10L32 12" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 20V16L24 17L20 18" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44 20V16L48 17L44 18" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>

    <path d="M32 28V30" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M18 34V36" strokeWidth={strokeWidth} strokeLinecap="round"/>
    <path d="M46 34V36" strokeWidth={strokeWidth} strokeLinecap="round"/>
  </svg>
);

export const Hero: React.FC<HeroProps> = ({ backgroundImage, onEnterShop }) => {
  // Use user provided image or a luxurious default
  const bgImage = backgroundImage || "https://i.postimg.cc/Fz5SrsnY/Gemini-Generated-Image-r4s83qr4s83qr4s8.png";

  return (
    <section className="relative h-[100dvh] min-h-[600px] flex items-center justify-center overflow-hidden bg-white">
      
      {/* Dynamic Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bgImage} 
          alt="Hero Background" 
          className="w-full h-full object-cover"
        />
        {/* Very subtle overlay to ensure text contrast without muddying the image */}
        <div className="absolute inset-0 bg-black/5"></div>
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-6 relative z-10 flex justify-center animate-slide-up">
        
        <div className="max-w-4xl w-full mx-auto relative group">
          
          {/* 
            Cream Color Transparent Box for Content
            Using brand-cream (#F2DDD0) with low opacity
            Rounded-3xl for extra cuteness
          */}
          <div className="absolute inset-0 bg-[#F2DDD0]/25 rounded-[40px] shadow-xl border border-[#F2DDD0]/40 -z-10"></div>
          
          {/* Inner decorative line for elegance */}
          <div className="absolute inset-2 border border-white/40 rounded-[32px] -z-10 pointer-events-none"></div>
          
          <div className="px-8 py-12 md:px-16 md:py-16 text-center relative">
            <div className="flex justify-center mb-6">
               <div className="p-4 bg-white/60 rounded-full border border-white/60 shadow-sm animate-breathe">
                 {/* Custom Disney-style Castle icon - Lighter gray for elegance */}
                 <FairyTaleCastle size={36} strokeWidth={1.5} className="text-gray-600" />
               </div>
            </div>

            <span className="block font-sans text-gray-900 tracking-[0.25em] uppercase text-[10px] md:text-xs mb-4 font-bold drop-shadow-sm">
              Little One's
            </span>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl text-gray-900 mb-8 leading-tight md:leading-snug relative drop-shadow-sm">
              <span className="font-serif">Timeless Comfort</span>
              <br />
              
              {/* Cloud Effect Container */}
              <span className="relative inline-block mt-4 md:ml-4 group-hover:scale-105 transition-transform duration-700 ease-in-out">
                 
                 {/* SVG Cloud Background - Adjusted size relative to text */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[240%] z-0 pointer-events-none select-none flex items-center justify-center opacity-95">
                    <CloudSVG className="w-full h-full text-white" />
                 </div>

                 {/* Text - Slightly smaller font, more padding for breathing room */}
                 <span className="font-script text-3xl md:text-5xl lg:text-6xl text-[#D68C94] relative z-10 px-6 md:px-10 py-2 block md:inline-block drop-shadow-sm whitespace-nowrap">
                    for Gentle Dreams
                    <Sparkles size={16} className="inline-block ml-2 mb-4 text-brand-gold animate-pulse drop-shadow-sm" />
                 </span>
              </span>
            </h1>
            
            <p className="font-serif italic text-gray-900/90 max-w-lg mx-auto mb-10 text-lg md:text-xl font-light leading-relaxed drop-shadow-sm">
              "Wrap your little one in the softness of our signature fabrics."
            </p>
            
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={onEnterShop}
                className="group relative px-12 py-5 bg-brand-flamingo text-white font-sans tracking-[0.2em] text-[11px] font-bold uppercase transition-all duration-500 hover:bg-brand-gold hover:scale-105 shadow-lg rounded-full"
              >
                 <span className="relative z-10 flex items-center justify-center gap-3">
                  View Collection
                </span>
              </button>
              
              <div className="flex items-center gap-4 text-gray-900/80 font-medium drop-shadow-sm">
                 <div className="h-[1px] w-12 bg-current opacity-50"></div>
                 <span className="font-script text-2xl">Est. 2026</span>
                 <div className="h-[1px] w-12 bg-current opacity-50"></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
