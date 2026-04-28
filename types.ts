
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  additionalImages?: string[];
  badge?: string;
  material?: string;
  care?: string;
  collection?: string;
  size?: string;
  stock?: number;
  hasSizes?: boolean;
  babyPrice?: number;
  babySizeDesc?: string;
  adultPrice?: number;
  adultSizeDesc?: string;
}

export interface CartItem extends Product {
  quantity: number;
  isPreOrder?: boolean;
  baseProductId?: string; // used for stock deduction if id is modified for variants
  sizeOption?: string;
}

export interface SiteConfig {
  heroImage: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'failed' | 'cancelled';
  date: string;
  shippingAddress: string;
  isGift?: boolean;
  giftTo?: string;
  giftFrom?: string;
}

export interface Subscriber {
  id: string;
  email: string;
  date: string;
}
