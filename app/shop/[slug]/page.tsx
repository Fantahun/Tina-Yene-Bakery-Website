import { notFound } from "next/navigation"

import { prisma } from "@/lib/prisma"
import { ProductDetail } from "@/components/products/product-detail"
import type { ShopProduct } from "@/lib/shop-types"

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>
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
      imageUrl: true,
      prepLeadTimeDays: true,
      pickupAllowed: true,
      deliveryAllowed: true,
      isActive: true,
      sortOrder: true,
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
