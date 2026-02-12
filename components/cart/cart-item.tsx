"use client"

import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, Trash2 } from "lucide-react"
import type { CartItem as CartItemType } from "@/store/cart-slice"
import { useAppDispatch } from "@/store/hooks"
import { removeFromCart, updateQuantity } from "@/store/cart-slice"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const dispatch = useAppDispatch()

  return (
    <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
      {/* Image */}
      <Link href={`/shop/${item.name.toLowerCase().replace(/\s+/g, "-")}`} className="shrink-0">
        <div className="relative h-24 w-24 overflow-hidden rounded-md sm:h-28 sm:w-28">
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="112px"
          />
        </div>
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-card-foreground">{item.name}</h3>
            <span className="shrink-0 font-bold text-foreground">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ${item.price.toFixed(2)} each
          </p>
          {item.prep_lead_time_days > 0 && (
            <Badge variant="outline" className="mt-1.5 text-xs">
              {item.prep_lead_time_days} day{item.prep_lead_time_days > 1 ? "s" : ""} prep time
            </Badge>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                dispatch(
                  updateQuantity({ id: item.id, quantity: item.quantity - 1 })
                )
              }
              disabled={item.quantity <= 1}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-8 text-center text-sm font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                dispatch(
                  updateQuantity({ id: item.id, quantity: item.quantity + 1 })
                )
              }
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => dispatch(removeFromCart(item.id))}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  )
}
