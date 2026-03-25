import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface CartItem {
  cart_key: string;
  id: number;
  slug: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;
  size_id?: number;
  size_name?: string;
  serves?: string;
  prep_lead_time_days: number;
  pickup_allowed: boolean;
  delivery_allowed: boolean;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem("YeneBakery_cart");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("YeneBakery_cart", JSON.stringify(items));
  } catch {
    // silent fail
  }
}

const initialState: CartState = {
  items: [],
  hydrated: false,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state) {
      state.items = loadCartFromStorage();
      state.hydrated = true;
    },
    addToCart(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        (item) => item.cart_key === action.payload.cart_key,
      );
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push({ ...action.payload });
      }
      saveCartToStorage(state.items);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter(
        (item) => item.cart_key !== action.payload,
      );
      saveCartToStorage(state.items);
    },
    updateQuantity(
      state,
      action: PayloadAction<{ cart_key: string; quantity: number }>,
    ) {
      const item = state.items.find(
        (line) => line.cart_key === action.payload.cart_key,
      );
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
      saveCartToStorage(state.items);
    },
    updateItemSize(
      state,
      action: PayloadAction<{
        current_cart_key: string;
        next_cart_key: string;
        size_id?: number;
        size_name?: string;
        serves?: string;
        price: number;
      }>,
    ) {
      const item = state.items.find(
        (line) => line.cart_key === action.payload.current_cart_key,
      );
      if (!item) return;

      const duplicate = state.items.find(
        (line) => line.cart_key === action.payload.next_cart_key,
      );
      if (duplicate && duplicate.cart_key !== item.cart_key) {
        duplicate.quantity += item.quantity;
        state.items = state.items.filter(
          (line) => line.cart_key !== item.cart_key,
        );
      } else {
        item.cart_key = action.payload.next_cart_key;
        item.size_id = action.payload.size_id;
        item.size_name = action.payload.size_name;
        item.serves = action.payload.serves;
        item.price = action.payload.price;
      }

      saveCartToStorage(state.items);
    },
    clearCart(state) {
      state.items = [];
      saveCartToStorage(state.items);
    },
  },
});

export const {
  hydrateCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  updateItemSize,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;

// Selectors
export const selectCartHydrated = (state: { cart: CartState }) =>
  state.cart.hydrated;
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0);
export const selectCartSubtotal = (state: { cart: CartState }) =>
  state.cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
export const selectMaxLeadTime = (state: { cart: CartState }) =>
  state.cart.items.length > 0
    ? Math.max(...state.cart.items.map((item) => item.prep_lead_time_days))
    : 0;
