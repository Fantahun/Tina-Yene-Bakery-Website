"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ShoppingBag, Minus, Plus, Clock, Truck, Store, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import type { Product } from "@/lib/mock-data"
import { useAppDispatch } from "@/store/hooks"
import { addToCart } from "@/store/cart-slice"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface ProductDetailProps {
  product: Product
}

export function ProductDetail({ product }: ProductDetailProps) {
  const dispatch = useAppDispatch()
  const [quantity, setQuantity] = useState(1)

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity,
        prep_lead_time_days: product.prep_lead_time_days,
        pickup_allowed: product.pickup_allowed,
        delivery_allowed: product.delivery_allowed,
      })
    )
    toast.success(`${quantity}x ${product.name} added to cart`)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumb */}
      <Button variant="ghost" asChild className="mb-6 gap-2 text-muted-foreground">
        <Link href="/shop">
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
          />
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            {product.category}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight text-foreground">
            {product.name}
          </h1>
          <p className="mt-2 text-3xl font-bold text-foreground">
            ${product.price.toFixed(2)}
          </p>

          <Separator className="my-6" />

          <p className="leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {/* Lead Time & Fulfillment */}
          <div className="mt-6 flex flex-col gap-3">
            {product.prep_lead_time_days > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Requires{" "}
                  <span className="font-medium text-foreground">
                    {product.prep_lead_time_days} day{product.prep_lead_time_days > 1 ? "s" : ""}
                  </span>{" "}
                  advance notice
                </span>
              </div>
            )}
            {product.prep_lead_time_days === 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Same-day</span> availability
                  (order before 11am)
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              {product.pickup_allowed && (
                <Badge variant="outline" className="gap-1.5">
                  <Store className="h-3 w-3" />
                  Pickup
                </Badge>
              )}
              {product.delivery_allowed && (
                <Badge variant="outline" className="gap-1.5">
                  <Truck className="h-3 w-3" />
                  Delivery
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Quantity & Add to Cart */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center rounded-lg border border-border">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="flex h-10 w-12 items-center justify-center text-sm font-medium text-foreground">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <Button
              size="lg"
              onClick={handleAddToCart}
              className="flex-1 gap-2 sm:max-w-xs"
            >
              <ShoppingBag className="h-5 w-5" />
              Add to Cart - ${(product.price * quantity).toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
