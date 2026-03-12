export interface Product {
  id: number;
  sku: string;
  name: string;
  image_url: string | null;
  category: string;
  price_buy: number;
  price_sell: number;
  stock: number;
  min_stock_alert: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  price: number;
  image_url: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}