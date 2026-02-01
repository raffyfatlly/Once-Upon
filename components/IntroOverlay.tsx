
import React, { useState } from 'react';
import { Crown, Star } from 'lucide-react';

interface IntroOverlayProps {
  onComplete: () => void;
  coverImage?: string; // Optional prop for the background image
}

export const IntroOverlay: React.FC<IntroOverlayProps> = ({ 
  onComplete,
  // Default luxury texture if no image is provided
  coverImage = "https://i.postimg.cc/25fThJhj/5na55d0nvnrmt0cw34fsyzg77c.png"
}) => {
  const [isOpen, setIsOpen] = useState(false);

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
                <Crown size={32} strokeWidth={1} className="text-gray-900" />
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
