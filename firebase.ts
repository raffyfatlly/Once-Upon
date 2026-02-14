
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, getDocs, runTransaction, setDoc, getDoc } from 'firebase/firestore';
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
  // Prevent duplicate initialization check
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  db = getFirestore(app);
  storage = getStorage(app);
  console.log("Firebase initialized successfully.");
} catch (error) {
  console.error("CRITICAL FIREBASE ERROR:", error);
}

export { db, storage };

// --- HELPER FUNCTIONS ---

// Products
export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  if (!db) {
    console.warn("Database not initialized, returning empty products.");
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
    console.error("Failed to subscribe to products", e);
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

  // 1. Trigger Auto-Cleanup/Release of Stale Orders BEFORE processing new one.
  try {
    console.log("Running pre-order stock cleanup...");
    await autoReleaseStaleOrders(5); 
  } catch (err) {
    console.warn("Auto-release failed during order creation (non-fatal):", err);
  }

  // Use a transaction to safely increment the order counter AND deduct stock
  return await runTransaction(db, async (transaction) => {
    
    // 2. STOCK CHECK: Read all product documents involved in the order first
    const productReads = orderData.items.map(item => {
      const ref = doc(db, 'products', item.id);
      return { ref, id: item.id, qty: item.quantity };
    });

    const productDocs = await Promise.all(productReads.map(p => transaction.get(p.ref)));

    // Check availability for each item
    productDocs.forEach((docSnapshot, index) => {
      const requestedItem = productReads[index];
      
      if (!docSnapshot.exists()) {
         throw new Error(`Product ${requestedItem.id} no longer exists.`);
      }
      
      const productData = docSnapshot.data();
      if (!productData) {
        throw new Error(`Product data missing for ${requestedItem.id}`);
      }

      // PRE-ORDER LOGIC UPDATE:
      // We no longer throw an error if currentStock < requestedItem.qty.
      // Instead, we allow the stock to go negative, which indicates pre-orders/backlog.
      // const currentStock = productData.stock || 0;
      // if (currentStock < requestedItem.qty) {
      //   throw new Error(`Sorry, "${productData.name}" is out of stock...`);
      // }
    });

    // 3. COUNTER CHECK: Reference the counter document
    const counterRef = doc(db, 'counters', 'orderCounter');
    const counterDoc = await transaction.get(counterRef);

    let nextId = 1000; // Default start value

    if (counterDoc.exists()) {
      const current = counterDoc.data().current;
      if (typeof current === 'number') {
        nextId = current + 1;
      }
    }

    // 4. WRITES: Now we perform all the updates
    
    // A. Deduct Stock (allowing negative values for pre-orders)
    productDocs.forEach((docSnapshot, index) => {
      const requestedItem = productReads[index];
      const productData = docSnapshot.data();
      const currentStock = (productData && productData.stock) || 0;
      const newStock = currentStock - requestedItem.qty;
      transaction.update(requestedItem.ref, { stock: newStock });
    });

    // B. Create Order ID
    const newOrderId = nextId.toString();
    const newOrderRef = doc(db, 'orders', newOrderId);

    // C. Update Counter
    transaction.set(counterRef, { current: nextId });

    // D. Create Order
    transaction.set(newOrderRef, {
      ...orderData,
      id: newOrderId // Store ID inside document as well for easier fetching
    });

    console.log(`Created Order #${newOrderId} and deducted stock.`);
    return newOrderRef; // Return the reference so frontend can use .id
  });
};

/**
 * RESTORE STOCK FUNCTION (Internal logic)
 * It reads the order, finds the items, and adds the quantity back to the products.
 */
export const restoreStockForOrder = async (orderId: string, newStatus: 'cancelled' | 'failed') => {
  if (!db) throw new Error("Database not connected.");
  const orderRef = doc(db, 'orders', orderId);

  await runTransaction(db, async (transaction) => {
    // 1. Get the Order
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error("Order not found");
    }

    const orderData = orderDoc.data() as Order;

    // Safety Check: Prevent double restoration
    if (orderData.status === 'cancelled' || orderData.status === 'failed') {
      console.log(`Order ${orderId} is already ${orderData.status}. Skipping stock restoration.`);
      return; 
    }

    // 2. Read all Product Docs involved
    const productReads = orderData.items.map(item => {
      const ref = doc(db, 'products', item.id);
      return { ref, qty: item.quantity };
    });

    const productDocs = await Promise.all(productReads.map(p => transaction.get(p.ref)));

    // 3. Write Updates (Restore Stock)
    productDocs.forEach((docSnapshot, index) => {
      if (docSnapshot.exists()) {
        const currentData = docSnapshot.data();
        const currentStock = currentData.stock || 0;
        const qtyToRestore = productReads[index].qty;
        
        transaction.update(productReads[index].ref, {
          stock: currentStock + qtyToRestore
        });
      }
    });

    // 4. Update Order Status
    transaction.update(orderRef, { status: newStatus });
  });
};

// ⚠️ NEW: Logic for Admin to update status and handle stock automatically
export const updateOrderAndRestock = async (orderId: string, newStatus: string, currentStatus: string) => {
  if (!db) throw new Error("Database not connected.");

  // If we are cancelling or failing an order, we must return stock
  if ((newStatus === 'cancelled' || newStatus === 'failed') && 
      (currentStatus !== 'cancelled' && currentStatus !== 'failed')) {
        await restoreStockForOrder(orderId, newStatus as 'cancelled' | 'failed');
  } else {
    // For other status changes (Pending -> Paid, Shipped, etc), stock is already deducted.
    // Just update the status text.
    await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
  }
};

/**
 * AUTO RELEASE STALE ORDERS
 * Checks for orders that have been 'pending' for more than {timeoutMinutes}.
 * Automatically cancels them and returns stock.
 */
export const autoReleaseStaleOrders = async (timeoutMinutes: number = 5): Promise<number> => {
  if (!db) throw new Error("Database not connected.");

  // 1. Get all pending orders
  const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  
  const now = Date.now();
  let releaseCount = 0;

  // 2. Check time difference
  const releasePromises = snapshot.docs.map(async (docSnapshot) => {
    const order = docSnapshot.data() as Order;
    const orderTime = new Date(order.date).getTime();
    const diffMinutes = (now - orderTime) / (1000 * 60);

    if (diffMinutes > timeoutMinutes) {
      console.log(`Order ${order.id} is stale (${Math.round(diffMinutes)} mins). Releasing stock...`);
      try {
        await restoreStockForOrder(order.id, 'cancelled');
        releaseCount++;
      } catch (err) {
        console.error(`Failed to auto-release order ${order.id}:`, err);
      }
    }
  });

  await Promise.all(releasePromises);
  return releaseCount;
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

export const getOrderById = async (orderId: string): Promise<Order | null> => {
  if (!db) throw new Error("Database not connected.");
  try {
    const docRef = doc(db, 'orders', orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Order;
    }
    return null;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
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
