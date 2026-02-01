
import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'The Dream Castle',
    price: 185,
    description: 'An intricate illustration of a whimsical palace in the clouds. Woven from the finest cashmere, this piece features subtle turret details and starry accents.',
    image: 'https://i.postimg.cc/9QVBP1b5/Gemini-Generated-Image-s2ybu4s2ybu4s2yb.png',
    material: '100% Grade-A Mongolian Cashmere',
    care: 'Dry clean recommended. Hand wash cold with gentle detergent. Lay flat to dry.'
  },
  {
    id: '2',
    name: 'The Parisian Flight',
    price: 145,
    description: 'Vintage hot air balloons drifting over Parisian rooftops. A delicate blend of organic cotton and silk, finished with a refined latte border.',
    image: 'https://i.postimg.cc/cCSNXQ23/Gemini-Generated-Image-tit282tit282tit2.png',
    material: '80% Organic Cotton, 20% Mulberry Silk',
    care: 'Machine wash delicate cycle in laundry bag. Tumble dry low.'
  },
];

export const NAVIGATION_LINKS = [
  { name: 'Shop', href: '#products' },
  { name: 'Our Story', href: '#story' },
  { name: 'Collections', href: '#collections' },
];
