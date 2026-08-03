"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { ShopProductSize } from "@/lib/shop-types";
import type { CartItem as CartItemType } from "@/store/cart-slice";
import { useAppDispatch } from "@/store/hooks";
import {
  removeFromCart,
  updateItemSize,
  updateQuantity,
} from "@/store/cart-slice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CatalogueImage } from "@/components/ui/catalogue-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const dispatch = useAppDispatch();
  const [sizes, setSizes] = useState<ShopProductSize[]>([]);
  const [productHasSizes, setProductHasSizes] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSizes = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) return;
        const products = (await res.json()) as Array<{
          id: number;
          has_sizes?: boolean;
          sizes?: ShopProductSize[];
        }>;
        const product = products.find((entry) => entry.id === item.id);
        if (!active) return;
        setProductHasSizes(Boolean(product?.has_sizes));
        setSizes((product?.sizes ?? []).filter((size) => size.is_active));
      } catch {
        if (active) {
          setProductHasSizes(false);
          setSizes([]);
        }
      }
    };

    void loadSizes();
    return () => {
      active = false;
    };
  }, [item.id]);

  const selectedSizeId = item.size_id ? String(item.size_id) : "";
  const canChangeSize = productHasSizes && sizes.length > 0;

  const selectedServesLabel = useMemo(() => {
    if (item.serves) return item.serves;
    const size = sizes.find((entry) => entry.id === item.size_id);
    return size?.serves ?? "";
  }, [item.serves, item.size_id, sizes]);

  const handleSizeChange = (sizeId: string) => {
    const nextSize = sizes.find((size) => String(size.id) === sizeId);
    if (!nextSize) return;

    dispatch(
      updateItemSize({
        current_cart_key: item.cart_key,
        next_cart_key: `product-${item.id}-size-${nextSize.id}`,
        size_id: nextSize.id,
        size_name: nextSize.name,
        serves: nextSize.serves,
        price: nextSize.price,
      }),
    );
  };

  return (
    <div className="flex gap-4 rounded-lg border border-border bg-card p-4">
      {/* Image */}
      <Link href={`/shop/${item.slug}`} className="shrink-0">
        <div className="relative h-24 w-24 overflow-hidden rounded-md sm:h-28 sm:w-28">
          <CatalogueImage
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
          {item.size_name ? (
            <p className="mt-1 text-xs font-medium text-foreground">
              Size: {item.size_name}
            </p>
          ) : null}
          {selectedServesLabel ? (
            <p className="text-xs text-muted-foreground">
              Serves: {selectedServesLabel}
            </p>
          ) : null}
          {item.prep_lead_time_days > 0 && (
            <Badge variant="outline" className="mt-1.5 text-xs">
              {item.prep_lead_time_days} day
              {item.prep_lead_time_days > 1 ? "s" : ""} prep time
            </Badge>
          )}
          {canChangeSize ? (
            <div className="mt-2 max-w-[210px]">
              <Select value={selectedSizeId} onValueChange={handleSizeChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose size" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem key={size.id} value={String(size.id)}>
                      {size.name} - ${size.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
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
                  updateQuantity({
                    cart_key: item.cart_key,
                    quantity: item.quantity - 1,
                  }),
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
                  updateQuantity({
                    cart_key: item.cart_key,
                    quantity: item.quantity + 1,
                  }),
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
            onClick={() => dispatch(removeFromCart(item.cart_key))}
            aria-label={`Remove ${item.name} from cart`}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
