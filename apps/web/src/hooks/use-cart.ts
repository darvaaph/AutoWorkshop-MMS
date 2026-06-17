import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemType } from '@/lib/api/transactions';

export interface CartItem {
  key: string;
  item_type: ItemType;
  item_id?: number;
  item_name: string;
  base_price: number;
  qty: number;
  // Available units for a catalog PRODUCT; undefined = unlimited (SERVICE / PACKAGE / EXTERNAL).
  // Client-side cap only — the server remains the source of truth at checkout.
  stock?: number;
}

/**
 * POS cart state + line-item operations. Keeps the cart self-contained
 * (stock-cap guards, dedup-by-key, subtotal) out of the page component.
 */
export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);

  function addToCart(item: Omit<CartItem, 'key' | 'qty'>) {
    const key = `${item.item_type}-${item.item_id ?? item.item_name}`;
    const existing = cart.find(c => c.key === key);
    if (existing && existing.stock != null && existing.qty >= existing.stock) {
      toast.error(`Stok ${existing.item_name} tinggal ${existing.stock}`);
      return;
    }
    setCart(prev => {
      const ex = prev.find(c => c.key === key);
      if (ex) {
        return prev.map(c => (c.key === key ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, key, qty: 1 }];
    });
  }

  function updateQty(key: string, delta: number) {
    if (delta > 0) {
      const c = cart.find(x => x.key === key);
      if (c && c.stock != null && c.qty >= c.stock) {
        toast.error(`Stok ${c.item_name} tinggal ${c.stock}`);
        return;
      }
    }
    setCart(prev =>
      prev
        .map(c => (c.key === key ? { ...c, qty: c.qty + delta } : c))
        .filter(c => c.qty > 0)
    );
  }

  function removeFromCart(key: string) {
    setCart(prev => prev.filter(c => c.key !== key));
  }

  function clearCart() {
    setCart([]);
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + item.base_price * item.qty,
    0
  );

  return { cart, addToCart, updateQty, removeFromCart, clearCart, subtotal };
}
