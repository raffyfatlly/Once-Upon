
import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface IntroOverlayProps {
  onComplete: () => void;
  coverImage?: string; // Optional prop for the background image
}

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

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ 
  onComplete,
  // Default luxury texture if no image is provided
  coverImage = "https://i.postimg.cc/25fThJhj/5na55d0nvnrmt0cw34fsyzg77c.png"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Lock body scroll when component mounts
    document.body.style.overflow = 'hidden';
    
    // Re-enable scroll when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleEnter = () => {
    setIsOpen(true);
    // Wait for animation to finish before unmounting (1.5s duration)
    setTimeout(onComplete, 1500); 
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-brand-latte/20`}>
        
        {/* 
           LEFT PANEL (Book Cover Left) 
           Width: 50vw
        */}
        <div className={`absolute left-0 top-0 bottom-0 w-1/2 bg-[#F2DDD0] border-r border-[#E5C0A8] transition-transform duration-[1500ms] cubic-bezier(0.6, 0.05, 0.01, 0.99) origin-left pointer-events-auto overflow-hidden
            ${isOpen ? '-translate-x-full' : 'translate-x-0'}
        `}>
            {/* The Background Image - Left Half */}
            <div className="absolute inset-0 w-full h-full">
                <img 
                  src={coverImage} 
                  alt="" 
                  className="absolute top-0 left-0 h-full w-[200%] max-w-none object-cover opacity-90 object-center md:object-left"
                />
                {/* Overlay to ensure text readability */}
                <div className="absolute inset-0 bg-[#F2DDD0]/40 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-black/5"></div>
            </div>

            {/* Spine Shadow / Depth */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-10"></div>
            
            {/* Corner Decoration */}
            <div className="absolute bottom-8 left-8 text-brand-gold/60 z-20">
               <Star size={24} className="animate-spin-slow" />
            </div>
        </div>

        {/* 
           RIGHT PANEL (Book Cover Right)
           Width: 50vw
        */}
        <div className={`absolute right-0 top-0 bottom-0 w-1/2 bg-[#F2DDD0] border-l border-white/20 transition-transform duration-[1500ms] cubic-bezier(0.6, 0.05, 0.01, 0.99) origin-right pointer-events-auto overflow-hidden
            ${isOpen ? 'translate-x-full' : 'translate-x-0'}
        `}>
            {/* The Background Image - Right Half */}
            <div className="absolute inset-0 w-full h-full">
                <img 
                   src={coverImage} 
                   alt="" 
                   className="absolute top-0 right-0 h-full w-[200%] max-w-none object-cover opacity-90 object-center md:object-right"
                />
                 {/* Overlay to ensure text readability */}
                 <div className="absolute inset-0 bg-[#F2DDD0]/40 mix-blend-multiply"></div>
                 <div className="absolute inset-0 bg-black/5"></div>
            </div>

            {/* Spine Highlight */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white/40 to-transparent pointer-events-none z-10"></div>

            {/* Corner Decoration */}
            <div className="absolute bottom-8 right-8 text-brand-gold/60 z-20">
               <Star size={24} className="animate-spin-slow" />
            </div>
        </div>

        {/* Center Content (Floating above panels, simulating the book Title) */}
         <div className={`relative z-10 flex flex-col items-center justify-center transition-all duration-700 pointer-events-auto
            ${isOpen ? 'opacity-0 scale-110 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0'}
         `}>
             {/* Decorative Border Box - "Gold Embossing" look */}
             <div className="absolute inset-[-40px] md:inset-[-60px] border border-white/60 rounded-[2px] pointer-events-none mix-blend-overlay"></div>
             <div className="absolute inset-[-34px] md:inset-[-54px] border border-white/40 rounded-[2px] pointer-events-none mix-blend-overlay"></div>

             <div className="mb-8 p-4 bg-white/80 backdrop-blur-md rounded-full shadow-lg border border-white/50">
                {/* Lighter color usage here */}
                <FairyTaleCastle size={36} strokeWidth={1.5} className="text-gray-600" />
             </div>

             <h1 className="font-serif text-4xl md:text-7xl text-gray-900 mb-2 tracking-widest text-center drop-shadow-lg text-white mix-blend-hard-light">
                ONCE UPON
             </h1>
             <p className="font-script text-3xl md:text-5xl text-white mb-12 drop-shadow-md transform -rotate-2">
                Kuala Lumpur
             </p>

             <button
                onClick={handleEnter}
                className="group relative px-12 py-5 bg-white/90 backdrop-blur text-gray-900 font-sans tracking-[0.25em] text-[10px] md:text-xs font-bold uppercase transition-all duration-500 hover:bg-brand-gold hover:text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 rounded-[2px] overflow-hidden"
             >
                <span className="relative z-10">Enter The Shop</span>
             </button>
             
             <p className="mt-8 font-serif italic text-white/80 text-sm drop-shadow">
                Est. 2026
             </p>
         </div>
    </div>
  );
};
