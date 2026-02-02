
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Product, Order, SiteConfig } from './types';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAPSOOVmpyt562qKGrM-Vec7szm-vxhEE",
  authDomain: "once-upon-24709.firebaseapp.com",
  projectId: "once-upon-24709",
  storageBucket: "once-upon-24709.firebasestorage.app",
  messagingSenderId: "826735245456",
  appId: "1:826735245456:web:bbde016d660736b6d2c015",
  measurementId: "G-7S9RM4C1NK"
};

// Initialize Firebase with Error Handling
// This prevents the "White Screen" if the API key is invalid or network blocks connection
let app;
let db: any;
let storage: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase initialized successfully for Project ID:", firebaseConfig.projectId);
} catch (error) {
  console.error("CRITICAL FIREBASE ERROR:", error);
  // We leave db undefined. The helpers below must handle this.
}

export { db, storage };

// --- HELPER FUNCTIONS ---

// Products
export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  // Graceful fallback if DB failed to load
  if (!db) {
    console.warn("Database not initialized. Returning empty product list.");
    callback([]);
    return () => {};
  }
  
  try {
    const q = query(collection(db, 'products'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      callback(products);
    }, (error) => {
      console.error("Error fetching products:", error);
      callback([]); 
    });
  } catch (e) {
    console.error("Error setting up product subscription:", e);
    callback([]);
    return () => {};
  }
};

export const addProductToDb = async (product: Omit<Product, 'id'>) => {
  if (!db) throw new Error("Database not connected. Check console for initialization errors.");
  return await addDoc(collection(db, 'products'), product);
};

export const updateProductInDb = async (id: string, updates: Partial<Product>) => {
  if (!db) throw new Error("Database not connected.");
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, updates);
};

export const deleteProductFromDb = async (id: string) => {
  if (!db) throw new Error("Database not connected.");
  await deleteDoc(doc(db, 'products', id));
};

// Orders
export const createOrderInDb = async (order: Omit<Order, 'id'>) => {
  if (!db) throw new Error("Database not connected.");
  return await addDoc(collection(db, 'orders'), order);
};

export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    }, (error) => {
      console.error("Order subscription error:", error);
    });
  } catch (e) {
    console.error("Error in subscribeToOrders:", e);
    callback([]);
    return () => {};
  }
};

export const getCustomerOrders = async (email: string): Promise<Order[]> => {
  if (!db) throw new Error("Database not connected.");
  
  // Note: Firestore requires an index for compound queries. 
  // To keep it simple without manual indexing, we query by email first, 
  // then filter by phone in the client component logic if needed, 
  // or just return all for email (security trade-off, but acceptable for MVP).
  // Here we just fetch by email.
  try {
    const q = query(
      collection(db, 'orders'), 
      where('customerEmail', '==', email)
    );
    
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    
    // Sort manually since we can't use orderBy without a composite index on email+date
    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    throw error;
  }
};

export const updateOrderStatusInDb = async (id: string, status: Order['status']) => {
  if (!db) throw new Error("Database not connected.");
  const docRef = doc(db, 'orders', id);
  await updateDoc(docRef, { status });
};

export const deleteOrderFromDb = async (id: string) => {
  if (!db) throw new Error("Database not connected.");
  await deleteDoc(doc(db, 'orders', id));
};

// Storage
export const uploadImage = async (file: File): Promise<string> => {
  if (!storage) throw new Error("Storage not initialized.");
  
  // Sanitize filename to avoid issues with special characters
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueName = `images/${Date.now()}_${sanitizedName}`;
  
  const storageRef = ref(storage, uniqueName);
  
  // Explicitly set content type to avoid "Precondition Failed" (412) if server expects specific types
  const metadata = {
    contentType: file.type,
  };
  
  try {
    const snapshot = await uploadBytes(storageRef, file, metadata);
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.error("Firebase Upload Error:", error);
    
    // Rethrow with a hint if it's the common permission issue
    // Code 412 (Precondition Failed) often means Rules rejected the request header/metadata
    if (
      error.code === 'storage/unknown' || 
      error.code === 'storage/unauthorized' || 
      error.code === 'storage/retry-limit-exceeded' ||
      error.message.includes('412')
    ) {
       throw new Error("Permission Denied (412): Please check your Firebase Storage Rules in the Console.");
    }
    throw error;
  }
};

// Site Config
export const updateSiteConfigInDb = async (config: SiteConfig) => {
  console.log("Saving config to DB:", config);
};
