"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { ShopProduct } from "@/lib/shop-types";
import { useAppDispatch } from "@/store/hooks";
import { addToCart } from "@/store/cart-slice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CatalogueImage } from "@/components/ui/catalogue-image";

interface ProductCardProps {
  product: ShopProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const dispatch = useAppDispatch();
  const activeSizes = (product.sizes ?? []).filter((size) => size.is_active);
  const hasSelectableSizes = Boolean(product.has_sizes && activeSizes.length > 0);
  const minPrice = hasSelectableSizes
    ? Math.min(...activeSizes.map((size) => size.price))
    : (product.min_price ?? product.price);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    dispatch(
      addToCart({
        cart_key: `product-${product.id}`,
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: 1,
        prep_lead_time_days: product.prep_lead_time_days,
        pickup_allowed: product.pickup_allowed,
        delivery_allowed: product.delivery_allowed,
      }),
    );
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden">
        <CatalogueImage
          src={product.image_url}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {product.prep_lead_time_days > 0 && (
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 bg-background/90 text-foreground"
          >
            {product.prep_lead_time_days} day
            {product.prep_lead_time_days > 1 ? "s" : ""} lead time
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {product.category}
        </p>
        <h3 className="mt-1 text-base font-semibold text-card-foreground group-hover:text-primary">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">
            {product.has_sizes
              ? `From $${minPrice.toFixed(2)}`
              : `$${product.price.toFixed(2)}`}
          </span>
          {product.has_sizes ? (
            <span className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Select Options
            </span>
          ) : (
            <Button size="sm" onClick={handleAddToCart} className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Add</span>
            </Button>
          )}
        </div>
      </div>
    </Link>
  );
}
