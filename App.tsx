
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

// Layout Component wrapping Navbar and Footer
const Layout: React.FC<{ 
  children: React.ReactNode;
  cartCount: number;
}> = ({ children, cartCount }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden selection:bg-brand-pink/20 selection:text-brand-flamingo">
      <Navbar 
        cartCount={cartCount} 
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
  
  return (
    <>
      <Hero backgroundImage={siteConfig.heroImage} onEnterShop={() => {
           document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
      }}/>
      
      <SectionDivider />

      <section id="products" className="py-20 md:py-24 relative min-h-screen">
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
               </div>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24 items-start px-4 md:px-0">
              {products.map((product, index) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={(p, qty) => onAddToCart(p, qty)}
                  onClick={(p) => navigate(`/product/${p.id}`)}
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
    </>
  );
};

const App: React.FC = () => {
  const { pathname } = useLocation();
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

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
    <Routes>
      {/* Public Store Routes */}
      <Route path="/" element={
        <Layout cartCount={cartCount}>
          <StoreFront products={products} siteConfig={siteConfig} onAddToCart={handleAddToCart} />
        </Layout>
      } />
      
      <Route path="/product/:id" element={
        <Layout cartCount={cartCount}>
          <ProductDetails products={products} onAddToCart={handleAddToCart} />
        </Layout>
      } />
      
      <Route path="/cart" element={
        <Layout cartCount={cartCount}>
          <CartView 
            cart={cart}
            onUpdateQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveFromCart}
          />
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
  );
};

export default App;
