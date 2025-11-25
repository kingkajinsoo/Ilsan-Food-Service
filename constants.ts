import { Product } from './types';

// In a real app, these would come from the DB, but requirements asked to manage in file
export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: '칠성사이다 업소용 355ml (24캔)',
    price: 18000,
    category: 'SODA',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
    isPepsiFamily: false,
  },
  {
    id: 'p2',
    name: '펩시콜라 업소용 355ml (24캔)',
    price: 17000,
    category: 'SODA',
    image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80',
    isPepsiFamily: true,
  },
  {
    id: 'p3',
    name: '펩시 제로 슈거 355ml (24캔)',
    price: 17500,
    category: 'SODA',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80', // Placeholder
    isPepsiFamily: true,
  },
  {
    id: 'p4',
    name: '탐스 제로 오렌지 355ml (24캔)',
    price: 16000,
    category: 'SODA',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80', // Placeholder
    isPepsiFamily: false,
  },
  {
    id: 'p5',
    name: '밀키스 250ml (30캔)',
    price: 15000,
    category: 'SODA',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80', // Placeholder
    isPepsiFamily: false,
  },
];

export const SERVICE_PRODUCT_OPTIONS = PRODUCTS.filter(p => p.isPepsiFamily || p.name.includes('사이다') || p.name.includes('탐스'));

// Supabase Configuration
export const SUPABASE_URL = 'https://jpqmfdgnjmfrxidzxjrz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcW1mZGduam1mcnhpZHp4anJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMzM2MzksImV4cCI6MjA3OTYwOTYzOX0.zzKYGj-MF783XtbMjpGV-Oxj_bq4p9O-x7xj2yrMsLE';
