import { createContext, useContext, useReducer, useState, useCallback, useEffect } from 'react'
import { fetchDeliveryFees } from '../data/deliveryZone'

const CartContext = createContext(null)
const CheckoutContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { item, addons } = action.payload
      const addonKey = addons.map(a => a.id).sort().join(',')
      const key = `${item.id}_${addonKey}`
      const existing = state.items.find(i => i.key === key)
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.key === key ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...item, key, quantity: 1, addons }],
      }
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.key !== action.payload),
      }
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.key === action.payload.key
            ? { ...i, quantity: Math.max(1, action.payload.quantity) }
            : i,
        ),
      }
    case 'CLEAR_CART':
      return { ...state, items: [] }
    default:
      return state
  }
}

function calcItemTotal(item) {
  const addonTotal = (item.addons || []).reduce((s, a) => s + a.price * (a.quantity || 1), 0)
  return (item.price + addonTotal) * item.quantity
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })
  const [cartOpen, setCartOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [deliveryFeeInZone, setDeliveryFeeInZone] = useState(40)
  const [deliveryFeeOutOfZone, setDeliveryFeeOutOfZone] = useState(80)

  const addItem = useCallback((item, addons = []) => {
    dispatch({ type: 'ADD_ITEM', payload: { item, addons } })
  }, [])

  const removeItem = useCallback((key) => {
    dispatch({ type: 'REMOVE_ITEM', payload: key })
  }, [])

  const updateQuantity = useCallback((key, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { key, quantity } })
  }, [])

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' })
  }, [])

  const items = state.items
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((s, i) => s + calcItemTotal(i), 0)
  const total = subtotal + deliveryFeeInZone

  useEffect(() => {
    fetchDeliveryFees().then(fees => {
      setDeliveryFeeInZone(fees.inZone)
      setDeliveryFeeOutOfZone(fees.outOfZone)
    })
  }, [])

  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const openCheckout = useCallback(() => {
    setCartOpen(false)
    setCheckoutOpen(true)
  }, [])
  const closeCheckout = useCallback(() => setCheckoutOpen(false), [])

  return (
      <CartContext.Provider
        value={{
          items,
          itemCount,
          subtotal,
          total,
          deliveryFeeInZone,
          deliveryFeeOutOfZone,
          setDeliveryFeeInZone,
          setDeliveryFeeOutOfZone,
          addItem,
        removeItem,
        updateQuantity,
        clearCart,
        cartOpen,
        openCart,
        closeCart,
      }}
    >
      <CheckoutContext.Provider
        value={{ checkoutOpen, openCheckout, closeCheckout }}
      >
        {children}
      </CheckoutContext.Provider>
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used within CheckoutProvider')
  return ctx
}
