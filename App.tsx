
import React, { useState, useEffect } from 'react';
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
import { Product, SiteConfig, CartItem, Order } from './types';
import { Star, Cloud, AlertCircle } from 'lucide-react';
import { subscribeToProducts, subscribeToOrders } from './firebase';

const SectionDivider = () => (
  <div className="flex items-center justify-center gap-4 py-8 opacity-40">
    <div className="h-[1px] w-12 md:w-24 bg-brand-latte"></div>
    <Star size={12} className="text-brand-latte" />
    <div className="h-[1px] w-12 md:w-24 bg-brand-latte"></div>
  </div>
);

type ViewMode = 'store' | 'login' | 'admin' | 'product_details' | 'cart' | 'checkout';

// FIX: Layout defined OUTSIDE App to prevent re-mounting (blinking) on state changes
const Layout: React.FC<{ 
  children: React.ReactNode;
  cartCount: number;
  onCartClick: () => void;
  onNavigate: (view: any) => void;
  onAdminClick: () => void;
}> = ({ children, cartCount, onCartClick, onNavigate, onAdminClick }) => (
  <div className="min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-brand-pink/20 selection:text-brand-flamingo">
    <Navbar 
      cartCount={cartCount} 
      onCartClick={onCartClick} 
      onNavigate={onNavigate}
    />
    <main className="flex-grow">
      {children}
    </main>
    <Footer onAdminClick={onAdminClick} />
  </div>
);

const App: React.FC = () => {
  // Application State
  const [view, setView] = useState<ViewMode>('store');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Data State - Now fetched from Firebase
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Site config still local for now, can be moved to DB later
  const [siteConfig, setSiteConfig] = useState<SiteConfig>(() => {
    const saved = localStorage.getItem('ou_config');
    return saved ? JSON.parse(saved) : { heroImage: '' };
  });

  // Cart State (Array of Items) - LocalStorage is fine for Cart (it's temporary per user)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('ou_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    // 1. Subscribe to Products
    const unsubscribeProducts = subscribeToProducts((fetchedProducts) => {
      setProducts(fetchedProducts);
    });

    // 2. Subscribe to Orders (Only really needed if admin, but we can load it)
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
    } catch (e) {
       console.error("Local Storage Full", e);
    }
  }, [siteConfig]);

  useEffect(() => {
    localStorage.setItem('ou_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    // Scroll to top when view changes
    window.scrollTo(0, 0);
  }, [view]);

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

  // Order Handler is now handled inside CheckoutView directly interacting with Firebase
  const handleOrderComplete = () => {
    setCart([]);
    setView('store');
    alert("Thank you! Your order has been placed.");
  };

  // Navigation Handlers
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setView('product_details');
  };

  const handleBackToStore = () => {
    setSelectedProduct(null);
    setView('store');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setView('admin');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setView('store');
  };

  // Cart Logic
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper Props for Layout
  const layoutProps = {
    cartCount,
    onCartClick: () => setView('cart'),
    onNavigate: setView,
    onAdminClick: () => setView('login')
  };

  // View Routing Logic
  if (view === 'login') {
    return <AdminLogin onLogin={handleLogin} onCancel={() => setView('store')} />;
  }

  if (view === 'admin' && isAuthenticated) {
    return (
      <AdminDashboard 
        products={products}
        siteConfig={siteConfig}
        orders={orders}
        onUpdateProducts={setProducts} // Now purely visual update, actual update is via DB functions
        onUpdateSiteConfig={setSiteConfig}
        onUpdateOrders={setOrders}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'checkout') {
    return (
      <CheckoutView 
        cart={cart}
        onBackToCart={() => setView('cart')}
        onOrderSuccess={handleOrderComplete}
      />
    );
  }

  if (view === 'cart') {
    return (
      <Layout {...layoutProps}>
        <CartView 
          cart={cart}
          onUpdateQuantity={handleUpdateCartQuantity}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={() => setView('checkout')}
          onContinueShopping={() => setView('store')}
        />
      </Layout>
    );
  }

  if (view === 'product_details' && selectedProduct) {
    return (
      <Layout {...layoutProps}>
        <ProductDetails 
          product={selectedProduct}
          onAddToCart={handleAddToCart}
          onBack={handleBackToStore}
        />
      </Layout>
    );
  }

  // Default Store View
  return (
    <Layout {...layoutProps}>
        <Hero backgroundImage={siteConfig.heroImage} onEnterShop={() => {
           // Scroll to products
           document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
        }}/>
        
        <SectionDivider />

        <section id="products" className="py-20 md:py-24 relative min-h-screen">
          {/* Whimsical Background Illustrations */}
          <Cloud className="absolute top-20 left-[-20px] text-brand-grey/60 w-32 h-32 animate-float opacity-50" strokeWidth={0.5} />
          <Cloud className="absolute bottom-40 right-[-20px] text-brand-grey/60 w-24 h-24 animate-float-delayed opacity-50" strokeWidth={0.5} />

          <div className="container mx-auto px-6 max-w-6xl">
            <div className="text-center mb-20 md:mb-28 relative">
              <span className="font-script text-3xl md:text-4xl text-brand-gold mb-2 block animate-fade-in">
                The Blanket Collection
              </span>
              <h2 className="font-serif text-4xl md:text-5xl text-gray-900 mb-6 leading-tight">
                Timeless <br/> <span className="italic font-light">Heirlooms</span>
              </h2>
              <div className="w-16 h-[1px] bg-brand-flamingo mx-auto my-6"></div>
            </div>

            {products.length === 0 ? (
               <div className="text-center text-gray-400 font-sans text-sm italic py-20 bg-brand-grey/5 rounded-lg border border-dashed border-brand-latte/30">
                 <div className="flex flex-col items-center gap-2">
                   <AlertCircle className="text-brand-latte" />
                   <p>No products found or database not connected.</p>
                   <p className="text-[10px] max-w-md mx-auto">Please ensure you have configured your firebase.ts file with your project keys and added products via the Admin Dashboard.</p>
                 </div>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24 items-start px-4 md:px-0">
                {products.map((product, index) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={(p, qty) => handleAddToCart(p, qty)}
                    onClick={handleProductClick}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
        
        <div className="py-10">
           <SectionDivider />
        </div>

        {/* Testimonial Section */}
        <section className="py-24 md:py-32 relative overflow-hidden bg-brand-grey/10">
           <div className="absolute top-0 left-0 right-0 h-2 scallop-border opacity-20"></div>

          <div className="container mx-auto px-6 max-w-3xl text-center relative z-10">
            <div className="mb-8 flex justify-center">
               <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-brand-gold fill-brand-gold" />)}
               </div>
            </div>
            
            <blockquote className="font-serif text-2xl md:text-4xl text-gray-900 italic leading-snug mb-10 px-4 relative">
              <span className="absolute -top-8 left-0 md:-left-8 font-script text-8xl text-brand-cream opacity-50 select-none">"</span>
              The only blanket my daughter sleeps with. It feels like a cloud and washes beautifully. Pure magic.
            </blockquote>
            
            <cite className="not-italic flex flex-col items-center gap-1">
              <span className="font-sans text-xs font-bold tracking-[0.2em] uppercase text-gray-900">Sophie M.</span>
              <span className="font-script text-xl text-brand-flamingo">Kuala Lumpur</span>
            </cite>
          </div>
          
           <div className="absolute bottom-0 left-0 right-0 h-2 scallop-border opacity-20 rotate-180"></div>
        </section>

        <Newsletter />
    </Layout>
  );
};

export default App;
