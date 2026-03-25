"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  Minus,
  Plus,
  Clock,
  Truck,
  Store,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import type { ShopProduct } from "@/lib/shop-types";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/cart-slice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ProductDetailProps {
  product: ShopProduct;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const dispatch = useAppDispatch();
  const [quantity, setQuantity] = useState(1);
  const activeSizes = useMemo(
    () => (product.sizes ?? []).filter((size) => size.is_active),
    [product.sizes],
  );
  const hasSelectableSizes = Boolean(
    product.has_sizes && activeSizes.length > 0,
  );
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(
    hasSelectableSizes ? activeSizes[0].id : null,
  );

  const selectedSize = hasSelectableSizes
    ? (activeSizes.find((size) => size.id === selectedSizeId) ?? null)
    : null;
  const selectedUnitPrice = selectedSize ? selectedSize.price : product.price;
  const cartKey = selectedSize
    ? `product-${product.id}-size-${selectedSize.id}`
    : `product-${product.id}`;

  const handleAddToCart = () => {
    if (hasSelectableSizes && !selectedSize) {
      toast.error("Please select a size before adding to cart");
      return;
    }

    dispatch(
      addToCart({
        cart_key: cartKey,
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: selectedUnitPrice,
        image_url: product.image_url,
        quantity,
        size_id: selectedSize?.id,
        size_name: selectedSize?.name,
        serves: selectedSize?.serves,
        prep_lead_time_days: product.prep_lead_time_days,
        pickup_allowed: product.pickup_allowed,
        delivery_allowed: product.delivery_allowed,
      }),
    );
    toast.success(
      `${quantity}x ${product.name}${selectedSize ? ` (${selectedSize.name})` : ""} added to cart`,
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Breadcrumb */}
      <Button
        variant="ghost"
        asChild
        className="mb-6 gap-2 text-muted-foreground"
      >
        <Link href="/shop">
          <ArrowLeft className="h-4 w-4" />
          Back to Shop
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-lg border border-border">
          <Image
            src={product.image_url || "/placeholder.jpg"}
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
          <p className="mt-2 text-3xl font-bold text-foreground transition-all duration-300">
            ${selectedUnitPrice.toFixed(2)}
          </p>

          <Separator className="my-6" />

          <p className="leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          {hasSelectableSizes ? (
            <div className="mt-6 space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                Select Size
              </p>
              <div className="space-y-2">
                {activeSizes.map((size) => {
                  const isSelected = selectedSizeId === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSizeId(size.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">
                        {size.name}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        ${size.price.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {selectedSize?.serves ? (
                <p className="text-sm text-muted-foreground">
                  Serves:{" "}
                  <span className="font-medium text-foreground">
                    {selectedSize.serves}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Lead Time & Fulfillment */}
          <div className="mt-6 flex flex-col gap-3">
            {product.prep_lead_time_days > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Requires{" "}
                  <span className="font-medium text-foreground">
                    {product.prep_lead_time_days} day
                    {product.prep_lead_time_days > 1 ? "s" : ""}
                  </span>{" "}
                  advance notice
                </span>
              </div>
            )}
            {product.prep_lead_time_days === 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Same-day</span>{" "}
                  availability (order before 11am)
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
              disabled={hasSelectableSizes && !selectedSize}
              className="flex-1 gap-2 sm:max-w-xs"
            >
              <ShoppingBag className="h-5 w-5" />
              Add to Cart - ${(selectedUnitPrice * quantity).toFixed(2)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
