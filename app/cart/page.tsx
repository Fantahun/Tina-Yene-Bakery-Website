"use client"

import { useState } from "react"
import Link from "next/link"
import { ShoppingBag, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import {
  selectCartItems,
  selectCartItemCount,
  selectCartHydrated,
  clearCart,
  removeFromCart,
} from "@/store/cart-slice"
import { detectMixedLeadTimes } from "@/lib/fulfillment"
import { CartItem } from "@/components/cart/cart-item"
import { CartSummary } from "@/components/cart/cart-summary"
import { MixedLeadtimeAlert } from "@/components/cart/mixed-leadtime-alert"
import { SplitOrderDialog } from "@/components/cart/split-order-dialog"
import { Button } from "@/components/ui/button"

export default function CartPage() {
  const items = useAppSelector(selectCartItems)
  const itemCount = useAppSelector(selectCartItemCount)
  const hydrated = useAppSelector(selectCartHydrated)
  const dispatch = useAppDispatch()
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)

  const { isMixed, groups } = detectMixedLeadTimes(
    items.map((i) => ({
      id: i.cart_key,
      name: i.name,
      prep_lead_time_days: i.prep_lead_time_days,
    }))
  )

  const handleSplitConfirm = () => {
    // Keep only the "quick" items in cart (group 0) and remove slow items
    const quickGroup = groups.find((g) => g.label === "Ready sooner")
    const slowGroup = groups.find((g) => g.label === "Needs more preparation")
    if (slowGroup) {
      slowGroup.items.forEach((item) => dispatch(removeFromCart(item.id)))
    }
    setSplitDialogOpen(false)
    toast.success(
      `Order split! ${quickGroup?.items.length || 0} item(s) kept in cart. You can order the remaining items separately.`
    )
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="rounded-full bg-muted p-6">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          Your cart is empty
        </h1>
        <p className="mt-2 text-muted-foreground">
          Looks like you have not added any delicious items yet.
        </p>
        <Button asChild className="mt-6 gap-2">
          <Link href="/shop">
            Browse Our Menu
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Your Cart
          </h1>
          <p className="mt-1 text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            dispatch(clearCart())
            toast.success("Cart cleared")
          }}
        >
          Clear Cart
        </Button>
      </div>

      {/* Mixed lead time alert */}
      {isMixed && (
        <div className="mb-6">
          <MixedLeadtimeAlert
            groups={groups}
            onSplit={() => setSplitDialogOpen(true)}
          />
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <CartItem key={item.cart_key} item={item} />
          ))}

          <Link
            href="/shop"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue Shopping
          </Link>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <CartSummary />
          </div>
        </div>
      </div>

      {/* Split Order Dialog */}
      <SplitOrderDialog
        open={splitDialogOpen}
        onClose={() => setSplitDialogOpen(false)}
        groups={groups}
        onConfirmSplit={handleSplitConfirm}
      />
    </div>
  )
}
