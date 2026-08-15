import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const CartContext = createContext(null)
const STORAGE_KEY = 'blueeco_cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        )
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          price: Number(product.price),
          image_path: product.image_path,
          quantity,
        },
      ]
    })
  }, [])

  const updateQuantity = useCallback((productId, quantity) => {
    setItems((prev) =>
      prev.map((i) => (i.product_id === productId ? { ...i, quantity: Math.max(1, quantity) } : i))
    )
  }, [])

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside a CartProvider')
  return ctx
}
