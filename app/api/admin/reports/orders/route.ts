import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.username) return null
  return session
}

function parseNumber(value: string | null, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseNumber(searchParams.get("page"), 1))
  const pageSize = Math.min(100, Math.max(5, parseNumber(searchParams.get("pageSize"), 20)))
  const search = searchParams.get("search")?.trim()
  const statusId = searchParams.get("statusId")
  const fulfillmentMethod = searchParams.get("fulfillmentMethod")
  const paymentStatus = searchParams.get("paymentStatus")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const format = searchParams.get("format")

  const where: {
    orderStatusId?: number
    fulfillmentMethod?: "pickup" | "delivery"
    paymentStatus?: "pending" | "paid" | "failed" | "refunded"
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

  if (fulfillmentMethod === "pickup" || fulfillmentMethod === "delivery") {
    where.fulfillmentMethod = fulfillmentMethod
  }

  if (paymentStatus === "pending" || paymentStatus === "paid" || paymentStatus === "failed" || paymentStatus === "refunded") {
    where.paymentStatus = paymentStatus
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

  if (format === "csv") {
    const rows = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { orderStatus: { select: { name: true } } },
    })

    const header = [
      "confirmation_number",
      "customer_name",
      "customer_email",
      "fulfillment_method",
      "order_status",
      "payment_status",
      "total",
      "created_at",
    ]

    const csv = [header.join(",")]
    for (const row of rows) {
      csv.push(
        [
          row.confirmationNumber,
          row.customerName,
          row.customerEmail,
          row.fulfillmentMethod,
          row.orderStatus?.name ?? "",
          row.paymentStatus,
          Number(row.total).toFixed(2),
          row.createdAt.toISOString(),
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
    }

    return new NextResponse(csv.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=orders-report.csv",
      },
    })
  }

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { orderStatus: { select: { name: true } } },
    }),
  ])

  const data = rows.map((row) => ({
    id: row.id,
    confirmation_number: row.confirmationNumber,
    customer_name: row.customerName,
    customer_email: row.customerEmail,
    fulfillment_method: row.fulfillmentMethod,
    order_status: row.orderStatus?.name ?? "",
    payment_status: row.paymentStatus,
    total: Number(row.total),
    created_at: row.createdAt.toISOString(),
  }))

  return NextResponse.json({
    page,
    pageSize,
    total,
    data,
  })
}
