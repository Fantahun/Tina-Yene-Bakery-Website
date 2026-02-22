import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.username) return null
  return session
}

function normalizeStatus(value: string) {
  return value.toLowerCase().trim().replace(/[\s-]+/g, "_")
}

export async function GET(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  const where: { createdAt?: { gte?: Date; lte?: Date } } = {}
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

  const [totalOrders, statusEntries, grouped, recentOrders, settings, fulfillmentGrouped] = await Promise.all([
    prisma.order.count({ where }),
    prisma.orderStatusEntry.findMany({ where: { deletedAt: null } }),
    prisma.order.groupBy({ by: ["orderStatusId"], _count: { _all: true }, where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { orderStatus: { select: { name: true } } },
    }),
    prisma.siteSetting.findFirst({ orderBy: { id: "asc" } }),
    prisma.order.groupBy({ by: ["fulfillmentMethod"], _count: { _all: true }, where }),
  ])

  const statusById = new Map(statusEntries.map((status) => [status.id, status.name]))
  const countsById = new Map<number, number>()
  for (const group of grouped) {
    countsById.set(group.orderStatusId, group._count._all)
  }

  const statusBreakdown = statusEntries.map((status) => ({
    id: status.id,
    name: status.name,
    count: countsById.get(status.id) ?? 0,
  }))

  const resolveStatusId = (normalizedName: string) => {
    for (const [id, name] of statusById.entries()) {
      if (normalizeStatus(name) === normalizedName) return id
    }
    return undefined
  }

  const pendingStatusId = settings?.dashboardPendingStatusId ?? resolveStatusId("pending")
  const inProgressStatusId = settings?.dashboardInProgressStatusId ?? resolveStatusId("in_preparation")
  const readyStatusId = settings?.dashboardReadyStatusId ?? resolveStatusId("ready_for_pickup")

  const pendingOrders = pendingStatusId ? countsById.get(pendingStatusId) ?? 0 : 0
  const inPreparation = inProgressStatusId ? countsById.get(inProgressStatusId) ?? 0 : 0
  const readyForPickup = readyStatusId ? countsById.get(readyStatusId) ?? 0 : 0

  const recent = recentOrders.map((order) => ({
    id: order.id,
    confirmation_number: order.confirmationNumber,
    customer_name: order.customerName,
    fulfillment_method: order.fulfillmentMethod,
    total: Number(order.total),
    order_status: order.orderStatus?.name ?? "",
  }))

  const fulfillmentBreakdown = fulfillmentGrouped.map((row) => ({
    method: row.fulfillmentMethod,
    count: row._count._all,
  }))

  return NextResponse.json({
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    in_preparation: inPreparation,
    ready_for_pickup: readyForPickup,
    recent_orders: recent,
    status_breakdown: statusBreakdown,
    fulfillment_breakdown: fulfillmentBreakdown,
  })
}
