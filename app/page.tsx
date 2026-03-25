import { HeroSlider } from "@/components/home/hero-slider"
import { CategoriesSection } from "@/components/home/categories-section"
import { FeaturedProducts } from "@/components/home/featured-products"
import { AboutSection } from "@/components/home/about-section"
import { CtaBanner } from "@/components/home/cta-banner"

import { prisma } from "@/lib/prisma"
import type { ShopCategory, ShopProduct } from "@/lib/shop-types"

// Public storefront pages use ISR so visitors get cached pages with background refreshes.
export const revalidate = 86400

const MAX_FEATURED = 4

async function getHomeData() {
  const [categories, topByQuantity] = await Promise.all([
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
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        product: {
          isActive: true,
          deletedAt: null,
          category: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: MAX_FEATURED,
    }),
  ])

  const mappedCategories: ShopCategory[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    image_url: category.imageUrl ?? "",
  }))

  const topProductIds = topByQuantity
    .map((row) => row.productId)
    .filter((id): id is number => id !== null)

  let featuredProducts = [] as ShopProduct[]

  if (topProductIds.length === MAX_FEATURED) {
    const products = await prisma.product.findMany({
      where: {
        id: { in: topProductIds },
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

    const orderIndex = new Map(topProductIds.map((id, index) => [id, index]))
    featuredProducts = products
      .sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0))
      .map((product) => ({
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
      }))
  } else {
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
      take: MAX_FEATURED,
    })

    featuredProducts = products.map((product) => ({
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
    }))
  }

  return { categories: mappedCategories, featuredProducts }
}

export default async function HomePage() {
  const { categories, featuredProducts } = await getHomeData()

  return (
    <>
      <HeroSlider />
      <CategoriesSection categories={categories} />
      <FeaturedProducts products={featuredProducts} />
      <AboutSection />
      <CtaBanner />
    </>
  )
}
