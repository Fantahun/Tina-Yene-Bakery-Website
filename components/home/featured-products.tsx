"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/products/product-card";
import { Button } from "@/components/ui/button";
import type { ShopProduct } from "@/lib/shop-types";

export function FeaturedProducts() {
  const [featured, setFeatured] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);

    let isMounted = true;

    const loadFeatured = async () => {
      try {
        const response = await fetch("/api/featured-products", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Failed to load featured products");
        }
        const data: ShopProduct[] = await response.json();
        if (isMounted) {
          setFeatured(data);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setFeatured([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadFeatured();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="bg-muted/50">
        <div className="flex items-center justify-center mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
        </div>
      </section>
    );
  }

  if (featured.length === 0) {
    return null;
  }

  return (
    <section className="bg-muted/50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Customer Favorites
            </h2>
            <p className="mt-2 text-muted-foreground">
              Our most loved cakes and pastries.
            </p>
          </div>
          <Button variant="ghost" asChild className="hidden sm:flex">
            <Link href="/shop" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Button variant="outline" asChild>
            <Link href="/shop" className="gap-2">
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
