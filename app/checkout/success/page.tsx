"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  CalendarDays,
  MapPin,
  Truck,
  Store,
  Package,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface OrderItem {
  name: string
  quantity: number
  price: number
  lineTotal: number
}

interface OrderData {
  confirmationNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  fulfillmentMethod: "pickup" | "delivery"
  fulfillmentDate: string
  pickupLocation?: { name: string; address: string } | null
  deliveryAddress?: string
  deliveryCity?: string
  deliveryState?: string
  deliveryZip?: string
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  orderNotes?: string
}

export default function OrderSuccessPage() {
  const [order, setOrder] = useState<OrderData | null>(null)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("tinabakery_last_order")
      if (stored) {
        setOrder(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">
          No order found
        </h1>
        <p className="mt-2 text-muted-foreground">
          It looks like you arrived here without placing an order.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse Our Menu</Link>
        </Button>
      </div>
    )
  }

  const fulfillmentDate = new Date(order.fulfillmentDate)

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Order Confirmed!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Thank you, {order.customerName}. Your order has been placed.
        </p>
        <p className="mt-1 text-lg font-semibold text-primary">
          Confirmation: {order.confirmationNumber}
        </p>
      </div>

      {/* Order Details Card */}
      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        {/* Fulfillment Info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div className="flex items-start gap-3">
            {order.fulfillmentMethod === "pickup" ? (
              <Store className="mt-0.5 h-5 w-5 text-primary" />
            ) : (
              <Truck className="mt-0.5 h-5 w-5 text-primary" />
            )}
            <div>
              <p className="text-sm font-medium text-card-foreground">
                {order.fulfillmentMethod === "pickup"
                  ? "Store Pickup"
                  : "Delivery"}
              </p>
              {order.fulfillmentMethod === "pickup" && order.pickupLocation && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {order.pickupLocation.name}
                  <br />
                  {order.pickupLocation.address}
                </p>
              )}
              {order.fulfillmentMethod === "delivery" && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {order.deliveryAddress}
                  <br />
                  {order.deliveryCity}, {order.deliveryState}{" "}
                  {order.deliveryZip}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Fulfillment Date
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {fulfillmentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {order.orderNotes && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Order Notes
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.orderNotes}
              </p>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Items */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <Package className="h-4 w-4" />
            Order Items
          </h3>
          <div className="mt-3 space-y-2">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">
                  ${item.lineTotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Email Notice */}
      <div className="mt-6 rounded-lg bg-muted p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to{" "}
            <strong className="text-foreground">{order.customerEmail}</strong>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/shop">
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild className="gap-2">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}
