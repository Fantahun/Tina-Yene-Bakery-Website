"use client";

import { useAppSelector } from "@/store/hooks";
import { selectCartItems, selectCartSubtotal } from "@/store/cart-slice";
import { Separator } from "@/components/ui/separator";
import { CatalogueImage } from "@/components/ui/catalogue-image";

export function OrderSummary() {
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-lg font-semibold text-card-foreground">Your Order</h2>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.cart_key} className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md">
              <CatalogueImage
                src={item.image_url}
                alt={item.name}
                fill
                className="object-cover"
                sizes="56px"
              />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-card-foreground">
                {item.name}
              </p>
              {item.size_name ? (
                <p className="text-xs text-foreground">
                  Size: {item.size_name}
                </p>
              ) : null}
              {item.serves ? (
                <p className="text-xs text-muted-foreground">
                  Serves: {item.serves}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                ${item.price.toFixed(2)} each
              </p>
            </div>
            <span className="text-sm font-medium">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-semibold">${subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
