import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.username) return null
  return session
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")
  const search = searchParams.get("search")?.trim().toLowerCase()
  const paymentStatus = searchParams.get("paymentStatus")
  const statusId = searchParams.get("statusId")
  const page = Math.max(1, Number(searchParams.get("page") ?? 1))
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("pageSize") ?? 20)))
  const format = searchParams.get("format")

  const where: { createdAt?: { gte?: Date; lte?: Date }; paymentStatus?: "pending" | "paid" | "failed" | "refunded" } = {}
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

  if (paymentStatus === "pending" || paymentStatus === "paid" || paymentStatus === "failed" || paymentStatus === "refunded") {
    where.paymentStatus = paymentStatus
  }

  if (statusId && statusId !== "all" && Number.isInteger(Number(statusId))) {
    where.orderStatusId = Number(statusId)
  }

  const grouped = await prisma.order.groupBy({
    by: ["fulfillmentMethod"],
    where,
    _count: { _all: true },
    _sum: { total: true, deliveryFee: true },
  })

  let rows = grouped.map((row) => ({
    fulfillment_method: row.fulfillmentMethod,
    orders: row._count._all,
    revenue: Number(row._sum.total ?? 0),
    delivery_fees: Number(row._sum.deliveryFee ?? 0),
    payment_status: paymentStatus ?? "all",
    status_id: statusId && statusId !== "all" ? Number(statusId) : null,
  }))

  if (search) {
    rows = rows.filter((row) => row.fulfillment_method.toLowerCase().includes(search))
  }

  if (format === "csv") {
    const header = ["fulfillment_method", "status", "payment_status", "orders", "revenue", "delivery_fees"]
    const csv = [header.join(",")]
    for (const row of rows) {
      csv.push(
        [
          row.fulfillment_method,
          row.status_id ?? "all",
          row.payment_status,
          row.orders,
          row.revenue.toFixed(2),
          row.delivery_fees.toFixed(2),
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      )
    }
    return new NextResponse(csv.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=fulfillment-report.csv",
      },
    })
  }

  const total = rows.length
  const startIndex = (page - 1) * pageSize
  const data = rows.slice(startIndex, startIndex + pageSize)

  return NextResponse.json({
    page,
    pageSize,
    total,
    data,
  })
}
