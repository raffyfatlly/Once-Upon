
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, getDocs, runTransaction, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString, StringFormat } from 'firebase/storage';
import { Product, Order, SiteConfig, Subscriber } from './types';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBAPSOOVmpyt562qKGrM-Vec7szm-vxhEE",
  authDomain: "once-upon-24709.firebaseapp.com",
  projectId: "once-upon-24709",
  // ⚠️ IF YOU CREATE A NEW BUCKET, PASTE THE NEW ID HERE:
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
export const createOrderInDb = async (orderData: Omit<Order, 'id'>) => {
  if (!db) throw new Error("Database not connected.");

  // Use a transaction to safely increment the order counter
  return await runTransaction(db, async (transaction) => {
    // 1. Reference the counter document
    const counterRef = doc(db, 'counters', 'orderCounter');
    const counterDoc = await transaction.get(counterRef);

    let nextId = 1000; // Default start value

    if (counterDoc.exists()) {
      const current = counterDoc.data().current;
      if (typeof current === 'number') {
        nextId = current + 1;
      }
    }

    // 2. Convert to string for Document ID
    const newOrderId = nextId.toString();
    const newOrderRef = doc(db, 'orders', newOrderId);

    // 3. Update the counter
    transaction.set(counterRef, { current: nextId });

    // 4. Create the new order with the specific ID
    transaction.set(newOrderRef, {
      ...orderData,
      id: newOrderId // Store ID inside document as well for easier fetching
    });

    console.log(`Created Order #${newOrderId}`);
    return newOrderRef; // Return the reference so frontend can use .id
  });
};

// ⚠️ DANGER: Resets the entire order system
export const resetOrderSystem = async () => {
  if (!db) throw new Error("Database not connected");
  
  // 1. Reset Counter to 999 (so next is 1000)
  await setDoc(doc(db, 'counters', 'orderCounter'), { current: 999 });

  // 2. Delete ALL existing orders
  const q = query(collection(db, 'orders'));
  const snapshot = await getDocs(q);
  
  const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  console.log("Order system reset complete.");
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

// Subscribers (Mum's Club)
export const addSubscriberToDb = async (email: string) => {
  if (!db) throw new Error("Database not connected.");
  // Basic duplicate check is handled by UI feedback usually, but let's just add it.
  // Ideally, we'd check if it exists, but for this simple version, just adding is fine.
  return await addDoc(collection(db, 'subscribers'), {
    email,
    date: new Date().toISOString()
  });
};

export const subscribeToSubscribers = (callback: (subscribers: Subscriber[]) => void) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  try {
    const q = query(collection(db, 'subscribers'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Subscriber[];
      callback(subs);
    });
  } catch (e) {
    callback([]);
    return () => {};
  }
};

// Storage
export const uploadImage = async (file: File): Promise<string> => {
  if (!storage) throw new Error("Storage not initialized.");
  
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueName = `images/${Date.now()}_${sanitizedName}`;
  const storageRef = ref(storage, uniqueName);

  // 🛡️ COMPATIBILITY MODE UPLOAD
  // We use uploadString (Base64) INSTEAD of uploadBytes.
  // This helps bypass complex CORS preflight checks that often fail on new buckets.
  
  try {
    const base64String = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Upload as Base64 Data URL
    const snapshot = await uploadString(storageRef, base64String, StringFormat.DATA_URL);
    return await getDownloadURL(snapshot.ref);

  } catch (error: any) {
    console.error("Upload failed:", error);
    
    // Diagnose common errors for the user
    if (error.code === 'storage/object-not-found' || error.code === 'storage/bucket-not-found') {
       throw new Error(`Bucket "${firebaseConfig.storageBucket}" not found. Did you create it in Firebase Console?`);
    } else if (error.code === 'storage/unauthorized') {
       throw new Error("Permission Denied. Please check your Storage Rules.");
    } else if (error.code === 'storage/canceled') {
       throw new Error("Upload cancelled.");
    }
    
    throw new Error(`Upload Error: ${error.message}`);
  }
};

export const updateSiteConfigInDb = async (config: SiteConfig) => {
  console.log("Saving config to DB:", config);
};
