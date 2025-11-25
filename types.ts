export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  business_name: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string | null;
  is_pepsi_family: boolean; // Vital for the 3+1 logic
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  user_name?: string; // Joined view
  business_name?: string; // Joined view
  items: OrderItem[];
  total_amount: number;
  total_boxes: number;
  service_items: OrderItem[];
  created_at: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
}

export interface ApronRequest {
  id: string;
  user_id: string;
  user_name?: string;
  business_name?: string;
  quantity: number;
  status: 'pending' | 'completed';
  created_at: string;
}
