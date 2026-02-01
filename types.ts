
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image: string;
  badge?: string;
  material?: string;
  care?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface SiteConfig {
  heroImage: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered';
  date: string;
  shippingAddress: string;
}
