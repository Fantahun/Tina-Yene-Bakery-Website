import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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
    });

    return NextResponse.json(
      products.map((product) => ({
        ...(() => {
          const minSizePrice =
            product.sizes.length > 0
              ? Math.min(...product.sizes.map((size) => Number(size.price)))
              : Number(product.price);
          return {
            has_sizes: product.hasSizes,
            min_price: minSizePrice,
            sizes: product.sizes.map((size) => ({
              id: size.id,
              name: size.name,
              serves: size.serves ?? "",
              price: Number(size.price),
              is_active: size.isActive,
              sort_order: size.sortOrder,
            })),
          };
        })(),
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
          "Cache-Control":
            "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load products", error);
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 },
    );
  }
}
