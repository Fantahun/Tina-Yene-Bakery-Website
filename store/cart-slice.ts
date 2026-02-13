import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export interface CartItem {
  id: number
  name: string
  price: number
  image_url: string
  quantity: number
  prep_lead_time_days: number
  pickup_allowed: boolean
  delivery_allowed: boolean
}

interface CartState {
  items: CartItem[]
  hydrated: boolean
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("YeneBakery_cart")
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem("YeneBakery_cart", JSON.stringify(items))
  } catch {
    // silent fail
  }
}

const initialState: CartState = {
  items: [],
  hydrated: false,
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state) {
      state.items = loadCartFromStorage()
      state.hydrated = true
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((item) => item.id === action.payload.id)
      if (existing) {
        existing.quantity += action.payload.quantity
      } else {
        state.items.push({ ...action.payload })
      }
      saveCartToStorage(state.items)
    },
    removeFromCart(state, action: PayloadAction<number>) {
      state.items = state.items.filter((item) => item.id !== action.payload)
      saveCartToStorage(state.items)
    },
    updateQuantity(
      state,
      action: PayloadAction<{ id: number; quantity: number }>
    ) {
      const item = state.items.find((item) => item.id === action.payload.id)
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity)
      }
      saveCartToStorage(state.items)
    },
    clearCart(state) {
      state.items = []
      saveCartToStorage(state.items)
    },
  },
})

export const { hydrateCart, addToCart, removeFromCart, updateQuantity, clearCart } =
  cartSlice.actions

export default cartSlice.reducer

// Selectors
export const selectCartHydrated = (state: { cart: CartState }) => state.cart.hydrated
export const selectCartItems = (state: { cart: CartState }) => state.cart.items
export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0)
export const selectCartSubtotal = (state: { cart: CartState }) =>
  state.cart.items.reduce((total, item) => total + item.price * item.quantity, 0)
export const selectMaxLeadTime = (state: { cart: CartState }) =>
  state.cart.items.length > 0
    ? Math.max(...state.cart.items.map((item) => item.prep_lead_time_days))
    : 0
