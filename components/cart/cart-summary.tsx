"use client"

import Link from "next/link"
import { ArrowRight, Clock } from "lucide-react"
import { useAppSelector } from "@/store/hooks"
import { selectCartSubtotal, selectMaxLeadTime } from "@/store/cart-slice"
import { getEarliestFulfillmentDate } from "@/lib/fulfillment"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function CartSummary() {
  const subtotal = useAppSelector(selectCartSubtotal)
  const maxLeadTime = useAppSelector(selectMaxLeadTime)
  const earliestDate = getEarliestFulfillmentDate(maxLeadTime)

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground">
        Order Summary
      </h2>

      <Separator className="my-4" />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-card-foreground">
            ${subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Delivery / Pickup</span>
          <span className="text-muted-foreground">Calculated at checkout</span>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-card-foreground">
          Total
        </span>
        <span className="text-lg font-bold text-foreground">
          ${subtotal.toFixed(2)}
        </span>
      </div>

      {/* Earliest fulfillment date */}
      <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-card-foreground">
            Earliest fulfillment
          </p>
          <p className="text-muted-foreground">
            {earliestDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {maxLeadTime > 0 && (
              <span>
                {" "}
                (due to {maxLeadTime}-day preparation time)
              </span>
            )}
          </p>
        </div>
      </div>

      <Button asChild className="mt-6 w-full gap-2" size="lg">
        <Link href="/checkout">
          Proceed to Checkout
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>

      <Link
        href="/shop"
        className="mt-3 block text-center text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        Continue Shopping
      </Link>
    </div>
  )
}
