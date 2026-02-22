"use client"

import Link from "next/link"
import { AlertCircle, CheckCircle2, Clock, Package, ShoppingBag } from "lucide-react"
import { useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const getDateInputValue = (offsetDays = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const datePresets = [
  { key: "7", label: "Last 7 days", startOffset: -7 },
  { key: "30", label: "Last 30 days", startOffset: -30 },
  { key: "90", label: "Last 90 days", startOffset: -90 },
  { key: "all", label: "All time", startOffset: null },
]

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => getDateInputValue(-30))
  const [endDate, setEndDate] = useState(() => getDateInputValue(0))
  const [selectedPreset, setSelectedPreset] = useState("30")
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    inPreparation: 0,
    readyForPickup: 0,
    recentOrders: [] as Array<{
      id: string
      confirmation_number: string
      customer_name: string
      fulfillment_method: string
      total: number
      order_status: string
    }>,
    statusBreakdown: [] as Array<{ id: number; name: string; count: number }>,
    fulfillmentBreakdown: [] as Array<{ method: string; count: number }>,
  })

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const params = new URLSearchParams()
        if (startDate) params.set("startDate", startDate)
        if (endDate) params.set("endDate", endDate)

        const res = await fetch(`/api/admin/dashboard?${params.toString()}`)
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "Failed to load dashboard")
        }
        const data = await res.json()
        setStats({
          totalOrders: data.total_orders ?? 0,
          pendingOrders: data.pending_orders ?? 0,
          inPreparation: data.in_preparation ?? 0,
          readyForPickup: data.ready_for_pickup ?? 0,
          recentOrders: data.recent_orders ?? [],
          statusBreakdown: data.status_breakdown ?? [],
          fulfillmentBreakdown: data.fulfillment_breakdown ?? [],
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load dashboard"
        setErrorMessage(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [startDate, endDate])

  const totalOrders = stats.totalOrders
  const pendingOrders = stats.pendingOrders
  const inPreparation = stats.inPreparation
  const readyForPickup = stats.readyForPickup

  const recentOrders = stats.recentOrders
  const statusBreakdown = stats.statusBreakdown
  const fulfillmentBreakdown = stats.fulfillmentBreakdown

  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey)
    const preset = datePresets.find((item) => item.key === presetKey)
    if (!preset) return
    if (preset.startOffset === null) {
      setStartDate("")
      setEndDate("")
      return
    }
    setStartDate(getDateInputValue(preset.startOffset))
    setEndDate(getDateInputValue(0))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of your bakery operations</p>
        {errorMessage ? (
          <p className="mt-2 text-sm text-destructive">{errorMessage}</p>
        ) : null}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
          <CardDescription>Filter dashboard metrics by order date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dashboard_start_date">Start Date</Label>
                <Input
                  id="dashboard_start_date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setSelectedPreset("custom")
                    setStartDate(e.target.value)
                  }}
                  className="pr-2"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard_end_date">End Date</Label>
                <Input
                  id="dashboard_end_date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setSelectedPreset("custom")
                    setEndDate(e.target.value)
                  }}
                  className="pr-2"
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {datePresets.map((preset) => (
                <Button
                  key={preset.key}
                  type="button"
                  variant={selectedPreset === preset.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(preset.key)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting preparation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inPreparation}</div>
            <p className="text-xs text-muted-foreground">Currently baking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyForPickup}</div>
            <p className="text-xs text-muted-foreground">Ready for pickup</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/yeneAdmin/orders">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading recent orders...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent orders found</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{order.confirmation_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.customer_name} • {order.fulfillment_method}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">${order.total.toFixed(2)}</p>
                    <p className="text-sm capitalize text-muted-foreground">
                      {order.order_status.replace("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
            <CardDescription>Orders by status for the selected date range</CardDescription>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No status data available</p>
            ) : (
              <ChartContainer
                config={{
                  count: {
                    label: "Orders",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdown} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fulfillment Breakdown</CardTitle>
            <CardDescription>Pickup vs delivery for the selected date range</CardDescription>
          </CardHeader>
          <CardContent>
            {fulfillmentBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fulfillment data available</p>
            ) : (
              <ChartContainer
                config={{
                  count: {
                    label: "Orders",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fulfillmentBreakdown} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="method" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
