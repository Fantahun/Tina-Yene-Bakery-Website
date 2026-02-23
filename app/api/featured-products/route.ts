import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

const MAX_FEATURED = 4

export async function GET() {
  try {
    const topByQuantity = await prisma.orderItem.groupBy({
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
    })

    const topProductIds = topByQuantity
      .map((row) => row.productId)
      .filter((id): id is number => id !== null)

    let products = []

    if (topProductIds.length === MAX_FEATURED) {
      products = await prisma.product.findMany({
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

      const orderIndex = new Map(topProductIds.map((id, index) => [id, index]))
      products.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0))
    } else {
      products = await prisma.product.findMany({
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
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: MAX_FEATURED,
      })
    }

    return NextResponse.json(
      products.map((product) => ({
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
      })),
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("Failed to load featured products", error)
    return NextResponse.json({ error: "Failed to load featured products" }, { status: 500 })
  }
}

