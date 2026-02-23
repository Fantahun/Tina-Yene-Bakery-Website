import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const locations = await prisma.pickupLocation.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
    })

    return NextResponse.json(
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        address: location.address,
        is_active: location.isActive,
      })),
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("Failed to load pickup locations", error)
    return NextResponse.json({ error: "Failed to load pickup locations" }, { status: 500 })
  }
}

