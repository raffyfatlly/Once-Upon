
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString, StringFormat } from 'firebase/storage';
import { Product, Order, SiteConfig } from './types';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBAPSOOVmpyt562qKGrM-Vec7szm-vxhEE",
  authDomain: "once-upon-24709.firebaseapp.com",
  projectId: "once-upon-24709",
  storageBucket: "once-upon-24709.firebasestorage.app",
  messagingSenderId: "826735245456",
  appId: "1:826735245456:web:bbde016d660736b6d2c015",
  measurementId: "G-7S9RM4C1NK"
};

// Initialize Firebase
let app;
let db: any;
let storage: any;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase initialized.");
} catch (error) {
  console.error("CRITICAL FIREBASE ERROR:", error);
}

export { db, storage };

// --- HELPER FUNCTIONS ---

// Products
export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'products'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      callback(products);
    }, (error) => {
      console.error("Error fetching products:", error);
      callback([]); 
    });
  } catch (e) {
    callback([]);
    return () => {};
  }
};

export const addProductToDb = async (product: Omit<Product, 'id'>) => {
  if (!db) throw new Error("Database not connected.");
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
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      callback(orders);
    });
  } catch (e) {
    callback([]);
    return () => {};
  }
};

export const getCustomerOrders = async (email: string): Promise<Order[]> => {
  if (!db) throw new Error("Database not connected.");
  try {
    const q = query(collection(db, 'orders'), where('customerEmail', '==', email));
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
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
  
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueName = `images/${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, uniqueName);
  
  // NOTE: Metadata (contentType) removed intentionally to prevent 412 Errors 
  // which occur if CORS/Rules aren't perfectly aligned or if the bucket is new.
  
  try {
    // Attempt 1: Standard UploadBytes (No Metadata)
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  } catch (error: any) {
    console.warn("Standard upload failed, attempting fallback...", error.code);
    
    // Attempt 2: Base64 String Upload
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const snapshot = await uploadString(storageRef, base64String, StringFormat.DATA_URL);
      return await getDownloadURL(snapshot.ref);
    } catch (fallbackError: any) {
      console.error("Fallback upload failed:", fallbackError);
      
      // If we get a 404, it usually means the bucket hasn't been "Started" in console
      if (fallbackError.code === 'storage/object-not-found' || fallbackError.code === 'storage/bucket-not-found' || (fallbackError.message && fallbackError.message.includes('404'))) {
         throw new Error("Bucket not found. Please go to Firebase Console > Storage and click 'Get Started'.");
      }
      
      throw new Error("Upload Failed. Please check the 'Fix Rules' box below.");
    }
  }
};

export const updateSiteConfigInDb = async (config: SiteConfig) => {
  console.log("Saving config to DB:", config);
};
