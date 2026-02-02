
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { Newsletter } from './components/Newsletter';
import { Footer } from './components/Footer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ProductDetails } from './components/ProductDetails';
import { CartView } from './components/CartView';
import { CheckoutView } from './components/CheckoutView';
import { PaymentCallback } from './components/PaymentCallback';
import { OrderLookup } from './components/OrderLookup';
import { CollectionView } from './components/CollectionView';
import { IntroOverlay } from './components/IntroOverlay';
import { OurStory } from './components/OurStory';
import { Product, SiteConfig, CartItem, Order } from './types';
import { Star, Cloud, AlertCircle, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { subscribeToProducts, subscribeToOrders } from './firebase';

const SectionDivider = () => (
  <div className="flex items-center justify-center gap-4 py-8 opacity-40">
    <div className="h-[1px] w-12 md:w-24 bg-brand-latte"></div>
    <Star size={12} className="text-brand-latte" />
    <div className="h-[1px] w-12 md:w-24 bg-brand-latte"></div>
  </div>
);

const REVIEWS = [
  {
    id: 1,
    text: "The only blanket my daughter sleeps with. It feels like a cloud and washes beautifully. Pure magic.",
    author: "Sophie M.",
    location: "Kuala Lumpur"
  },
  {
    id: 2,
    text: "Absolutely stunning quality. The print is even more beautiful in person, like a piece of art.",
    author: "Sarah J.",
    location: "Singapore"
  },
  {
    id: 3,
    text: "Softest organic cotton I've ever felt. It’s become our go-to gift for every new mum.",
    author: "Emily T.",
    location: "Penang"
  }
];

// Layout Component wrapping Navbar and Footer
const Layout: React.FC<{ 
  children: React.ReactNode;
  cartCount: number;
  products: Product[];
}> = ({ children, cartCount, products }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-brand-pink/20 selection:text-brand-flamingo">
      <Navbar 
        cartCount={cartCount} 
        products={products}
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer onAdminClick={() => navigate('/admin/login')} />
    </div>
  );
};

// Main Store View Component
const StoreFront: React.FC<{ 
  products: Product[]; 
  siteConfig: SiteConfig; 
  onAddToCart: (p: Product, qty: number) => void; 
}> = ({ products, siteConfig, onAddToCart }) => {
  const navigate = useNavigate();
  
  // Group products by collection
  const groupedProducts = products.reduce((acc, product) => {
    const collection = product.collection || 'Blankets';
    if (!acc[collection]) acc[collection] = [];
    acc[collection].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Review Carousel State
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  // Auto-rotate reviews
  useEffect(() => {
    const interval = setInterval(() => {
      nextReview();
    }, 6000); // 6 seconds per slide
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Hero backgroundImage={siteConfig.heroImage} onEnterShop={() => {
           document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
      }}/>
      
      <SectionDivider />

      <section id="products" className="py-24 md:py-32 relative min-h-screen">
        <Cloud className="absolute top-20 left-[-20px] text-brand-grey/60 w-32 h-32 animate-float opacity-50" strokeWidth={0.5} />
        <Cloud className="absolute bottom-40 right-[-20px] text-brand-grey/60 w-24 h-24 animate-float-delayed opacity-50" strokeWidth={0.5} />

        <div className="container mx-auto max-w-[1400px] relative z-10">
          
          {/* Enhanced Collection Header */}
          <div className="relative mb-24 md:mb-36 flex flex-col items-center text-center px-6">
             
             {/* Background Watermark */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none whitespace-nowrap z-0">
               <span className="font-serif text-[8rem] md:text-[14rem] leading-none text-gray-900">
                 Signature
               </span>
             </div>

             <div className="relative z-10">
               <div className="flex items-center justify-center gap-4 mb-6 opacity-60">
                 <div className="h-[1px] w-8 md:w-12 bg-gray-400"></div>
                 <span className="font-sans text-[10px] tracking-[0.3em] uppercase text-gray-500 font-bold">
                   Curated for Dreamers
                 </span>
                 <div className="h-[1px] w-8 md:w-12 bg-gray-400"></div>
               </div>

               <h2 className="font-serif text-5xl md:text-7xl text-gray-900 leading-none mb-2">
                 The Signature
               </h2>
               
               <div className="relative -mt-2 md:-mt-4">
                  <span className="font-script text-6xl md:text-8xl text-brand-flamingo block drop-shadow-sm">
                    Collection
                  </span>
                  <Star size={16} className="absolute top-2 -right-4 md:top-4 md:-right-6 text-brand-gold animate-pulse" fill="currentColor" />
               </div>

               <div className="mt-12 max-w-lg mx-auto">
                 <p className="font-serif italic text-lg text-gray-600 leading-relaxed mb-6">
                   "Weaving stories into the softest threads. Every piece is designed to be cherished, held, and loved."
                 </p>
                 <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-brand-gold/80">
                   {Object.keys(groupedProducts).length > 0 ? (
                      Object.keys(groupedProducts).map((c, i) => (
                        <React.Fragment key={c}>
                          <span>{c}</span>
                          {i < Object.keys(groupedProducts).length - 1 && <span>•</span>}
                        </React.Fragment>
                      ))
                   ) : (
                     <>
                        <span>Blankets</span>
                        <span>•</span>
                        <span>Swaddle (coming soon)</span>
                     </>
                   )}
                 </div>
               </div>
             </div>
          </div>

          {products.length === 0 ? (
             <div className="text-center text-gray-400 font-sans text-sm italic py-20 bg-brand-grey/5 rounded-lg border border-dashed border-brand-latte/30 mx-6">
               <div className="flex flex-col items-center gap-2">
                 <AlertCircle className="text-brand-latte" />
                 <p>No products found or database not connected.</p>
               </div>
             </div>
          ) : (
            <div>
              {Object.entries(groupedProducts).map(([collectionName, collectionProducts]) => (
                <div key={collectionName} className="mb-32 last:mb-0">
                  {Object.keys(groupedProducts).length > 1 && (
                     <div className="px-6 mb-12 text-center md:text-left md:pl-12">
                       <h3 className="font-serif text-3xl text-gray-900">{collectionName}</h3>
                     </div>
                  )}
                  
                  {/* 
                     CAROUSEL LAYOUT 
                     Mobile: Vertical Stack (flex-col)
                     Desktop: Horizontal Scroll (flex-row + overflow-x-auto)
                     Update: Added md:justify-center to center products on desktop.
                  */}
                  <div className="
                    flex flex-col gap-24 px-6
                    md:flex-row md:overflow-x-auto md:gap-16 md:px-12 md:pb-16 md:snap-x hide-scrollbar items-center md:justify-center
                  ">
                    {(collectionProducts as Product[]).map((product, index) => (
                      <div 
                        key={product.id} 
                        className="w-full md:min-w-[400px] md:max-w-[400px] md:snap-center flex-shrink-0"
                      >
                        <ProductCard 
                          product={product} 
                          onAddToCart={(p, qty) => onAddToCart(p, qty)}
                          onClick={(p) => navigate(`/product/${p.id}`)}
                          index={index}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      
      <section className="py-24 md:py-32 relative overflow-hidden bg-brand-grey/10">
         <div className="absolute top-0 left-0 right-0 h-2 scallop-border opacity-20"></div>

        <div className="container mx-auto px-6 max-w-4xl text-center relative z-10">
          
          {/* Review Carousel Wrapper */}
          <div className="relative">
             
             {/* Nav Arrows (Desktop) */}
             <button onClick={prevReview} className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 p-3 text-brand-latte hover:text-brand-flamingo transition-colors z-20 group">
                <ChevronLeft size={32} strokeWidth={1} className="group-hover:-translate-x-1 transition-transform" />
             </button>
             <button onClick={nextReview} className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 p-3 text-brand-latte hover:text-brand-flamingo transition-colors z-20 group">
                <ChevronRight size={32} strokeWidth={1} className="group-hover:translate-x-1 transition-transform" />
             </button>

             {/* Slider Window */}
             <div className="overflow-hidden">
                <div 
                   className="flex transition-transform duration-700 ease-in-out" 
                   style={{ transform: `translateX(-${currentReviewIndex * 100}%)` }}
                >
                   {REVIEWS.map((review) => (
                      <div key={review.id} className="w-full flex-shrink-0 px-4 md:px-8 flex flex-col items-center">
                         <div className="mb-8 flex justify-center gap-1">
                             {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-brand-gold fill-brand-gold" />)}
                         </div>
                         
                         <blockquote className="font-serif text-2xl md:text-3xl lg:text-4xl text-gray-900 italic leading-snug mb-10 relative max-w-2xl mx-auto">
                            <span className="absolute -top-6 left-0 md:-left-6 font-script text-6xl md:text-8xl text-brand-cream opacity-50 select-none">"</span>
                            {review.text}
                         </blockquote>
                         
                         <cite className="not-italic flex flex-col items-center gap-1">
                            <span className="font-sans text-xs font-bold tracking-[0.2em] uppercase text-gray-900">{review.author}</span>
                            <span className="font-script text-xl text-brand-flamingo">{review.location}</span>
                         </cite>
                      </div>
                   ))}
                </div>
             </div>

             {/* Mobile Nav & Dots */}
             <div className="flex items-center justify-center gap-6 mt-12">
                <button onClick={prevReview} className="md:hidden text-brand-latte hover:text-brand-flamingo p-2">
                   <ChevronLeft size={20} />
                </button>
                
                <div className="flex justify-center gap-2">
                   {REVIEWS.map((_, idx) => (
                     <button
                       key={idx}
                       onClick={() => setCurrentReviewIndex(idx)}
                       className={`transition-all duration-500 rounded-full h-1.5 ${
                         idx === currentReviewIndex 
                           ? 'w-8 bg-brand-gold' 
                           : 'w-1.5 bg-brand-latte/30 hover:bg-brand-latte'
                       }`}
                       aria-label={`Go to review ${idx + 1}`}
                     />
                   ))}
                </div>

                <button onClick={nextReview} className="md:hidden text-brand-latte hover:text-brand-flamingo p-2">
                   <ChevronRight size={20} />
                </button>
             </div>

          </div>
        </div>
        
         <div className="absolute bottom-0 left-0 right-0 h-2 scallop-border opacity-20 rotate-180"></div>
      </section>

      <Newsletter />
    </>
  );
};

const App: React.FC = () => {
  const { pathname } = useLocation();
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Initialize showIntro. 
  // If we are landing on the payment callback page (e.g. returning from gateway),
  // we default to FALSE to avoid showing the book cover again.
  const [showIntro, setShowIntro] = useState(() => {
    if (window.location.hash.includes('payment/callback')) return false;
    return true;
  });

  // Site config
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    try {
      const saved = localStorage.getItem('ou_config');
      return saved ? JSON.parse(saved) : { heroImage: '' };
    } catch (e) {
      return { heroImage: '' };
    }
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ou_cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    const unsubscribeProducts = subscribeToProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
    });
    const unsubscribeOrders = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
    });
    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ou_config', JSON.stringify(siteConfig));
    } catch (e) {}
  }, [siteConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('ou_cart', JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { ...product, quantity: quantity }];
    });
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleOrderComplete = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {showIntro && (
        <IntroOverlay 
           onComplete={() => setShowIntro(false)} 
           coverImage="https://i.postimg.cc/25fThJhj/5na55d0nvnrmt0cw34fsyzg77c.png"
        />
      )}
      
      <Routes>
        {/* Public Store Routes */}
        <Route path="/" element={
          <Layout cartCount={cartCount} products={products}>
            <StoreFront products={products} siteConfig={siteConfig} onAddToCart={handleAddToCart} />
          </Layout>
        } />
        
        <Route path="/story" element={
          <Layout cartCount={cartCount} products={products}>
            <OurStory />
          </Layout>
        } />

        <Route path="/product/:id" element={
          <Layout cartCount={cartCount} products={products}>
            <ProductDetails products={products} onAddToCart={handleAddToCart} />
          </Layout>
        } />
        
        <Route path="/collections/:name" element={
          <Layout cartCount={cartCount} products={products}>
            <CollectionView products={products} onAddToCart={handleAddToCart} />
          </Layout>
        } />
        
        <Route path="/cart" element={
          <Layout cartCount={cartCount} products={products}>
            <CartView 
              cart={cart}
              onUpdateQuantity={handleUpdateCartQuantity}
              onRemoveItem={handleRemoveFromCart}
            />
          </Layout>
        } />
        
        <Route path="/orders" element={
          <Layout cartCount={cartCount} products={products}>
            <OrderLookup />
          </Layout>
        } />
        
        <Route path="/checkout" element={
          <CheckoutView 
            cart={cart}
            onOrderSuccess={handleOrderComplete}
          />
        } />

        <Route path="/payment/callback" element={
          <PaymentCallback />
        } />

        {/* Admin Routes */}
        <Route path="/admin/login" element={
          <AdminLogin onLogin={() => setIsAuthenticated(true)} />
        } />
        
        <Route path="/admin/dashboard" element={
          isAuthenticated ? (
            <AdminDashboard 
              products={products}
              siteConfig={siteConfig}
              orders={orders}
              onUpdateProducts={setProducts}
              onUpdateSiteConfig={setSiteConfig}
              onUpdateOrders={setOrders}
              onLogout={() => setIsAuthenticated(false)}
            />
          ) : (
            <AdminLogin onLogin={() => setIsAuthenticated(true)} />
          )
        } />

        {/* Catch-all Route: Redirect to Home if 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
