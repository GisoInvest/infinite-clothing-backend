import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useDebouncedCallback } from '@/hooks/useDebounce';

export interface CartItem {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
  category: string;
  subcategory: string;
  size?: string;
  color?: string;
  discount?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Save cart to abandoned carts database
  const saveAbandonedCart = trpc.abandonedCart.save.useMutation();

  // Debounced function to save abandoned cart
  const saveCartToDb = useDebouncedCallback(() => {
    if (items.length > 0) {
      const sessionId = localStorage.getItem('sessionId') || generateSessionId();
      const cartTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      saveAbandonedCart.mutate({
        sessionId,
        cartData: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          size: item.size,
          color: item.color,
        })),
        cartTotal,
        customerEmail: undefined,
        customerName: undefined,
      });
    }
  }, 500); // Debounce by 500ms

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
    saveCartToDb();
  }, [items, saveCartToDb]);

  // Generate unique session ID
  const generateSessionId = () => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sessionId', sessionId);
    return sessionId;
  };

  const addItem = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
    setItems(current => {
      // Check if same product with same size already exists
      const existingIndex = current.findIndex(i => 
        i.productId === item.productId && i.size === item.size
      );
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex].quantity += item.quantity || 1;
        return updated;
      }
      return [...current, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeItem = (productId: number) => {
    setItems(current => current.filter(i => i.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(current => {
      const updated = [...current];
      const index = updated.findIndex(i => i.productId === productId);
      if (index >= 0) {
        updated[index].quantity = quantity;
      }
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const contextValue = useMemo(() => ({
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
  }), [items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

