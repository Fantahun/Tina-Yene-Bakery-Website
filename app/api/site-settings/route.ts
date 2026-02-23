import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const settings = await prisma.siteSetting.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        cutoffTime: true,
        deliveryFee: true,
        minOrderDelivery: true,
        storePhone: true,
        storeEmail: true,
      },
    })

    if (!settings) {
      return NextResponse.json(
        {
          cutoff_time: "11:00",
          delivery_fee: 0,
          min_order_delivery: 0,
          store_phone: "",
          store_email: "",
        },
        { status: 200 },
      )
    }

    return NextResponse.json(
      {
        cutoff_time: settings.cutoffTime ?? "11:00",
        delivery_fee: Number(settings.deliveryFee ?? 0),
        min_order_delivery: Number(settings.minOrderDelivery ?? 0),
        store_phone: settings.storePhone ?? "",
        store_email: settings.storeEmail ?? "",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
        },
      },
    )
  } catch (error) {
    console.error("Failed to load site settings", error)
    return NextResponse.json({ error: "Failed to load site settings" }, { status: 500 })
  }
}

