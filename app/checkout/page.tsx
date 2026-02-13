"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { selectCartItems, selectCartHydrated } from "@/store/cart-slice"
import { CheckoutForm } from "@/components/checkout/checkout-form"
import { OrderSummary } from "@/components/checkout/order-summary"

export default function CheckoutPage() {
  const router = useRouter()
  const items = useAppSelector(selectCartItems)
  const hydrated = useAppSelector(selectCartHydrated)

  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.push("/cart")
    }
  }, [items, hydrated, router])

  if (!hydrated || items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/cart"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Cart
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
        Checkout
      </h1>
      <p className="mt-1 text-muted-foreground">
        Complete your order details below.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CheckoutForm />
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  )
}
