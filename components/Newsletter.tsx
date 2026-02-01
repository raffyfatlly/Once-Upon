import React from 'react';

export const Newsletter: React.FC = () => {
  return (
    <section className="py-24 bg-white relative">
      <div className="container mx-auto px-6 max-w-2xl">
        {/* Invitation Card Look */}
        <div className="relative p-8 md:p-12 border border-brand-latte/30 bg-brand-grey/5 text-center">
           {/* Inner Border */}
           <div className="absolute inset-2 border border-dashed border-brand-latte/30 pointer-events-none"></div>
           
           <div className="relative z-10">
              <h3 className="font-script text-4xl text-brand-gold mb-2">Le Club</h3>
              <h4 className="font-serif text-2xl md:text-3xl text-gray-900 mb-6">Join Our World</h4>
              
              <p className="font-sans text-gray-500 mb-8 font-light text-sm leading-relaxed px-4">
                Be the first to receive whimsical stories, new collection drops, and exclusive gifts from our studio.
              </p>
              
              <form className="flex flex-col gap-4 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Your Email Address"
                  className="bg-white border-b border-brand-latte/50 px-4 py-3 font-serif text-center text-gray-800 focus:outline-none focus:border-brand-flamingo transition-colors placeholder:text-gray-300 placeholder:italic placeholder:font-serif text-lg"
                />
                <button 
                  type="submit"
                  className="mt-4 bg-gray-900 text-white px-8 py-3.5 font-sans uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-brand-flamingo transition-colors w-full rounded-[2px]"
                >
                  Subscribe
                </button>
              </form>
           </div>
        </div>
      </div>
    </section>
  );
};