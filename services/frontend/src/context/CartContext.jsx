import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { cartApi } from '../api'
import { useAuth } from './AuthContext'

const CartContext = createContext()

const GUEST_CART_KEY = 'guest_cart'

function getGuestCart() {
  const stored = localStorage.getItem(GUEST_CART_KEY)
  return stored ? JSON.parse(stored) : { items: [], subtotal: 0, tax: 0, total: 0, item_count: 0 }
}

function saveGuestCart(cart) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart))
}

function recalcGuest(items) {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const tax = Math.round(subtotal * 0.085 * 100) / 100
  return { items, subtotal: Math.round(subtotal * 100) / 100, tax, total: Math.round((subtotal + tax) * 100) / 100, item_count: items.reduce((s, i) => s + i.quantity, 0) }
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState({ items: [], subtotal: 0, tax: 0, total: 0, item_count: 0 })
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (user) {
      try {
        const { data } = await cartApi.getCart(user.id)
        setCart(data)
      } catch (e) {
        console.error('Failed to fetch cart', e)
      }
    } else {
      setCart(getGuestCart())
    }
  }, [user])

  useEffect(() => { fetchCart() }, [fetchCart])

  const addItem = async (product, quantity = 1) => {
    setLoading(true)
    const item = { product_id: product.id, name: product.name, brand: product.brand, price: product.price, image_url: product.image_url, quantity }
    try {
      if (user) {
        const { data } = await cartApi.addItem(user.id, item)
        setCart(data)
      } else {
        const gCart = getGuestCart()
        const existing = gCart.items.find(i => i.product_id === product.id)
        if (existing) existing.quantity += quantity
        else gCart.items.push(item)
        const updated = recalcGuest(gCart.items)
        saveGuestCart(updated)
        setCart(updated)
      }
    } finally {
      setLoading(false)
    }
  }

  const updateItem = async (productId, quantity) => {
    setLoading(true)
    try {
      if (user) {
        const { data } = await cartApi.updateItem(user.id, productId, quantity)
        setCart(data)
      } else {
        const gCart = getGuestCart()
        if (quantity <= 0) gCart.items = gCart.items.filter(i => i.product_id !== productId)
        else { const item = gCart.items.find(i => i.product_id === productId); if (item) item.quantity = quantity }
        const updated = recalcGuest(gCart.items)
        saveGuestCart(updated)
        setCart(updated)
      }
    } finally {
      setLoading(false)
    }
  }

  const removeItem = async (productId) => updateItem(productId, 0)

  const clearCart = async () => {
    setLoading(true)
    try {
      if (user) {
        await cartApi.clearCart(user.id)
      } else {
        localStorage.removeItem(GUEST_CART_KEY)
      }
      setCart({ items: [], subtotal: 0, tax: 0, total: 0, item_count: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <CartContext.Provider value={{ cart, addItem, updateItem, removeItem, clearCart, loading, fetchCart }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
