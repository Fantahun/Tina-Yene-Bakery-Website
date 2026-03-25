import { notFound } from "next/navigation"

import { ProductDetail } from "@/components/products/product-detail"
import { prisma } from "@/lib/prisma"
import type { ShopProduct } from "@/lib/shop-types"

export const revalidate = 86400

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      category: {
        isActive: true,
        deletedAt: null,
      },
    },
    select: {
      slug: true,
    },
  })

  return products.map((product) => ({
    slug: product.slug,
  }))
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params
  const product = await prisma.product.findFirst({
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
