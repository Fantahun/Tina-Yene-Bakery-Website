import { ShopPageClient } from "./shop-page-client";
import { Suspense } from "react";

import { unstable_cache } from "next/cache";

import { prisma, prismaReady } from "@/lib/prisma";
import { DEFAULT_PUBLIC_REVALIDATE_SECONDS } from "@/lib/isr";
import type { ShopCategory, ShopProduct } from "@/lib/shop-types";

// Rendered on demand so the deployment build needs no database connection;
// the cached data layer below keeps MySQL traffic to one query per expiry.
export const dynamic = "force-dynamic";

async function getShopPageData() {
  // Ensure the query engine has finished starting before firing concurrent
  // queries at it - on a cold start that race panics the engine.
  await prismaReady();

  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        products: {
          some: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        category: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        hasSizes: true,
        imageUrl: true,
        prepLeadTimeDays: true,
        pickupAllowed: true,
        deliveryAllowed: true,
        isActive: true,
        sortOrder: true,
        sizes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            serves: true,
            price: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const mappedCategories: ShopCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    image_url: category.imageUrl ?? "",
  }));

  const mappedProducts: ShopProduct[] = products.map((product) => ({
    has_sizes: product.hasSizes,
    min_price:
      product.sizes.length > 0
        ? Math.min(...product.sizes.map((size) => Number(size.price)))
        : Number(product.price),
    sizes: product.sizes.map((size) => ({
      id: size.id,
      name: size.name,
      serves: size.serves ?? "",
      price: Number(size.price),
      is_active: size.isActive,
      sort_order: size.sortOrder,
    })),
    id: product.id,
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: Number(product.price),
    image_url: product.imageUrl ?? "",
    prep_lead_time_days: product.prepLeadTimeDays,
    pickup_allowed: product.pickupAllowed,
    delivery_allowed: product.deliveryAllowed,
    is_active: product.isActive,
    sort_order: product.sortOrder,
    category: product.category?.name,
    category_slug: product.category?.slug,
  }));

  return { categories: mappedCategories, products: mappedProducts };
}

const getCachedShopPageData = unstable_cache(getShopPageData, ["shop-page-data"], {
  revalidate: DEFAULT_PUBLIC_REVALIDATE_SECONDS,
  tags: ["shop-data", "products", "categories"],
});

export default async function ShopPage() {
  const { categories, products } = await getCachedShopPageData();

  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[50vh] items-center justify-center">
          Loading shop...
        </div>
      }
    >
      <ShopPageClient categories={categories} products={products} />
    </Suspense>
  );
}
