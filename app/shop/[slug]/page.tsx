import { notFound } from "next/navigation"
import { unstable_cache } from "next/cache"

import { ProductDetail } from "@/components/products/product-detail"
import { prisma } from "@/lib/prisma"
import { DEFAULT_PUBLIC_REVALIDATE_SECONDS } from "@/lib/isr"
import type { ShopProduct } from "@/lib/shop-types"

// Rendered on demand so the deployment build needs no database connection.
export const dynamic = "force-dynamic"

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

// generateStaticParams was removed: enumerating product slugs requires a database
// connection the build machine does not have. Product pages now render on first
// request, with the per-slug query cached below so repeat visitors cost no queries.

async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: {
      slug,
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
  })
}

// Cache per slug so a popular product costs one query per revalidation window
// rather than one per visitor.
const getCachedProductBySlug = (slug: string) =>
  unstable_cache(() => getProductBySlug(slug), ["product-detail", slug], {
    revalidate: DEFAULT_PUBLIC_REVALIDATE_SECONDS,
    tags: ["products", `product:${slug}`],
  })()

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const product = await getCachedProductBySlug(slug)

  if (!product) {
    notFound()
  }

  const mappedProduct: ShopProduct = {
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
  }

  return <ProductDetail product={mappedProduct} />
}
