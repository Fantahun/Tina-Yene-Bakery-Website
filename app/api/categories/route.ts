import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        products: {
          // Only include categories that have at least one active, non-deleted product
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
    })

    return NextResponse.json(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image_url: category.imageUrl ?? "",
      })),
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("Failed to load categories", error)
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 })
  }
}
