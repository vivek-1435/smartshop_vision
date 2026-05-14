import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [shopId, setShopId] = useState(null);

  const addItem = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.name === product.name);
      if (existing) return prev.map((i) => i.name === product.name ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeItem = (name) => setCart((prev) => prev.filter((i) => i.name !== name));

  const updateQty = (name, qty) => {
    if (qty <= 0) { removeItem(name); return; }
    setCart((prev) => prev.map((i) => i.name === name ? { ...i, qty } : i));
  };

  const clearCart = () => setCart([]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  return (
    <CartContext.Provider value={{ cart, shopId, setShopId, addItem, removeItem, updateQty, clearCart, subtotal, gst, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
