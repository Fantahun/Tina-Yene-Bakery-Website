import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.username) return null
  return session
}

function mapOrder(order: {
  id: string
  confirmationNumber: string
  customerName: string
  customerEmail: string
  customerPhone: string
  businessName: string | null
  fulfillmentMethod: "pickup" | "delivery"
  fulfillmentDate: Date
  pickupLocation: { name: string } | null
  deliveryAddress: string | null
  subtotal: any
  deliveryFee: any
  total: any
  orderNotes: string | null
  paymentStatus: string
  stripeSessionId: string | null
  stripePaymentIntentId: string | null
  createdAt: Date
  orderStatusId: number
  orderStatus: { name: string }
  items: Array<{
    productName: string
    quantity: number
    unitPrice: any
    lineTotal: any
  }>
}) {
  return {
    id: order.id,
    confirmation_number: order.confirmationNumber,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    business_name: order.businessName ?? undefined,
    fulfillment_method: order.fulfillmentMethod,
    fulfillment_date: order.fulfillmentDate.toISOString(),
    pickup_location: order.pickupLocation?.name,
    delivery_address: order.deliveryAddress ?? undefined,
    subtotal: Number(order.subtotal),
    delivery_fee: Number(order.deliveryFee),
    total: Number(order.total),
    order_notes: order.orderNotes ?? undefined,
    order_status: order.orderStatus.name,
    order_status_id: order.orderStatusId,
    payment_status: order.paymentStatus,
    stripeSessionId: order.stripeSessionId ?? undefined,
    stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
    created_at: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      product_name: item.productName,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      line_total: Number(item.lineTotal),
    })),
  }
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")?.trim()
  const statusId = searchParams.get("statusId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const where: {
    orderStatusId?: number
    createdAt?: { gte?: Date; lte?: Date }
    OR?: Array<{
      confirmationNumber?: { contains: string; mode: "insensitive" }
      customerName?: { contains: string; mode: "insensitive" }
      customerEmail?: { contains: string; mode: "insensitive" }
    }>
  } = {}

  if (statusId && statusId !== "all") {
    const id = Number(statusId)
    if (Number.isInteger(id)) {
      where.orderStatusId = id
    }
  }

  if (startDate || endDate) {
    const range: { gte?: Date; lte?: Date } = {}
    if (startDate) range.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      range.lte = end
    }
    where.createdAt = range
  }

  if (search) {
    where.OR = [
      { confirmationNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      pickupLocation: { select: { name: true } },
      orderStatus: { select: { name: true } },
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },
  })

  return NextResponse.json(orders.map(mapOrder))
}

export async function PATCH(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.id !== "string" || !Number.isInteger(body.order_status_id)) {
    return NextResponse.json({ error: "id and order_status_id are required" }, { status: 400 })
  }

  const updated = await prisma.order.update({
    where: { id: body.id },
    data: {
      orderStatusId: body.order_status_id,
      updatedBy: session.user?.username,
    },
    include: {
      pickupLocation: { select: { name: true } },
      orderStatus: { select: { name: true } },
      items: {
        select: {
          productName: true,
          quantity: true,
          unitPrice: true,
          lineTotal: true,
        },
      },
    },
  })

  return NextResponse.json(mapOrder(updated))
}
