import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Prisma } from "@prisma/client"

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

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseNumber(searchParams.get("page"), 1))
    const pageSize = Math.min(100, Math.max(5, parseNumber(searchParams.get("pageSize"), 20)))
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search")?.trim()
    const paymentStatus = searchParams.get("paymentStatus")
    const statusId = searchParams.get("statusId")
    const fulfillmentMethod = searchParams.get("fulfillmentMethod")
    const format = searchParams.get("format")

    const conditions: string[] = []
    const params: Array<string | number | Date> = []

    if (search) {
      conditions.push("oi.productName LIKE ?")
      params.push(`%${search}%`)
    }

    if (startDate) {
      conditions.push("o.createdAt >= ?")
      params.push(new Date(startDate))
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      conditions.push("o.createdAt <= ?")
      params.push(end)
    }

    if (paymentStatus === "pending" || paymentStatus === "paid" || paymentStatus === "failed" || paymentStatus === "refunded") {
      conditions.push("o.paymentStatus = ?")
      params.push(paymentStatus)
    }

    if (statusId && statusId !== "all" && Number.isInteger(Number(statusId))) {
      conditions.push("o.orderStatusId = ?")
      params.push(Number(statusId))
    }

    if (fulfillmentMethod === "pickup" || fulfillmentMethod === "delivery") {
      conditions.push("o.fulfillmentMethod = ?")
      params.push(fulfillmentMethod)
    }

    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
    const offset = (page - 1) * pageSize

    if (format === "csv") {
      const rowsAll = await prisma.$queryRawUnsafe<
        Array<{ productName: string; quantity: number | bigint; revenue: unknown }>
      >(
        `
          SELECT oi.productName AS productName,
                 SUM(oi.quantity) AS quantity,
                 SUM(oi.lineTotal) AS revenue
          FROM OrderItem oi
          INNER JOIN \`Order\` o ON o.id = oi.orderId
          ${whereSql}
          GROUP BY oi.productName
          ORDER BY revenue DESC, productName ASC
        `,
        ...params,
      )

      const header = ["product_name", "status", "payment_status", "fulfillment", "quantity", "revenue"]
      const csv = [header.join(",")]
      for (const row of rowsAll) {
        csv.push(
          [
            row.productName,
            statusId && statusId !== "all" ? statusId : "all",
            paymentStatus ?? "all",
            fulfillmentMethod ?? "all",
            Number(row.quantity ?? 0),
            Number(row.revenue ?? 0).toFixed(2),
          ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(","),
        )
      }
      return new NextResponse(csv.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=products-report.csv",
        },
      })
    }

    const rows = await prisma.$queryRawUnsafe<
      Array<{ productName: string; quantity: number | bigint; revenue: unknown }>
    >(
      `
        SELECT oi.productName AS productName,
               SUM(oi.quantity) AS quantity,
               SUM(oi.lineTotal) AS revenue
        FROM OrderItem oi
        INNER JOIN \`Order\` o ON o.id = oi.orderId
        ${whereSql}
        GROUP BY oi.productName
        ORDER BY revenue DESC, productName ASC
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    )

    const totalRows = await prisma.$queryRawUnsafe<Array<{ total: number | bigint }>>(
      `
        SELECT COUNT(DISTINCT oi.productName) AS total
        FROM OrderItem oi
        INNER JOIN \`Order\` o ON o.id = oi.orderId
        ${whereSql}
      `,
      ...params,
    )

    const total = totalRows[0]?.total ? Number(totalRows[0].total) : 0

    const data = rows.map((row) => ({
      product_name: row.productName,
      quantity: Number(row.quantity ?? 0),
      revenue: Number(row.revenue ?? 0),
      payment_status: paymentStatus ?? "all",
      status_id: statusId && statusId !== "all" ? Number(statusId) : null,
      fulfillment_method: fulfillmentMethod ?? "all",
    }))

    return NextResponse.json({
      page,
      pageSize,
      total,
      data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load products report"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
