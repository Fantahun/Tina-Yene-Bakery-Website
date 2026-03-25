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
    if (!stored) return [];

    const parsed = JSON.parse(stored) as Array<Partial<CartItem>>;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (
          !item ||
          typeof item.id !== "number" ||
          typeof item.name !== "string"
        ) {
          return null;
        }

        const sizeSuffix = item.size_id ? `-size-${item.size_id}` : "";
        const fallbackSlug = item.name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

        return {
          cart_key: item.cart_key ?? `product-${item.id}${sizeSuffix}`,
          id: item.id,
          slug: item.slug ?? fallbackSlug,
          name: item.name,
          price: typeof item.price === "number" ? item.price : 0,
          image_url:
            typeof item.image_url === "string"
              ? item.image_url
              : "/placeholder.jpg",
          quantity:
            typeof item.quantity === "number" ? Math.max(1, item.quantity) : 1,
          size_id: item.size_id,
          size_name: item.size_name,
          serves: item.serves,
          prep_lead_time_days:
            typeof item.prep_lead_time_days === "number"
              ? item.prep_lead_time_days
              : 0,
          pickup_allowed:
            typeof item.pickup_allowed === "boolean"
              ? item.pickup_allowed
              : true,
          delivery_allowed:
            typeof item.delivery_allowed === "boolean"
              ? item.delivery_allowed
              : true,
        } as CartItem;
      })
      .filter((item): item is CartItem => item !== null);
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
