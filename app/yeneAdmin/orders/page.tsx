"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Eye, Filter, MapPin, Package, Search, Truck } from "lucide-react"

import { OrderDetailsDialog } from "@/components/admin/order-details-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type OrderStatusEntry, type Order } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  in_preparation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ready_for_pickup: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

function normalizeStatus(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_")
}

function getStatusClass(name: string) {
  return statusColors[normalizeStatus(name)] ?? "bg-muted text-foreground"
}

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

export default function AdminOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState(() => getDateInputValue(-30))
  const [endDate, setEndDate] = useState(() => getDateInputValue(0))
  const [selectedPreset, setSelectedPreset] = useState("30")
  const [orders, setOrders] = useState<Order[]>([])
  const [statuses, setStatuses] = useState<OrderStatusEntry[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadStatuses = async () => {
    try {
      const res = await fetch("/api/admin/order-statuses")
      if (!res.ok) throw new Error("Failed to load statuses")
      const data = (await res.json()) as OrderStatusEntry[]
      setStatuses(data)
    } catch {
      setStatuses([])
    }
  }

  const loadOrders = async (searchValue: string, statusValue: string, start: string, end: string) => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (searchValue) params.set("search", searchValue)
      if (statusValue) params.set("statusId", statusValue)
      if (start) params.set("startDate", start)
      if (end) params.set("endDate", end)

      const res = await fetch(`/api/admin/orders?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to load orders")
      }
      const data = (await res.json()) as Order[]
      setOrders(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load orders"
      setErrorMessage(message)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStatuses()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadOrders(searchQuery, statusFilter, startDate, endDate)
    }, 300)

    return () => clearTimeout(timeout)
  }, [searchQuery, statusFilter, startDate, endDate])

  const filteredOrders = useMemo(() => orders, [orders])

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
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <p className="mt-1 text-muted-foreground">Manage and track customer orders</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filter Orders</CardTitle>
          <CardDescription>Search and filter by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, name, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={String(status.id)}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="orders_start_date" className="text-sm font-medium text-foreground">
                    Start Date
                  </label>
                  <Input
                    id="orders_start_date"
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
                  <label htmlFor="orders_end_date" className="text-sm font-medium text-foreground">
                    End Date
                  </label>
                  <Input
                    id="orders_end_date"
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {errorMessage ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Unable to load orders</h3>
              <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Loading orders</h3>
              <p className="mt-2 text-sm text-muted-foreground">Please wait</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">No orders found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                  <div className="flex flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{order.confirmation_number}</p>
                        <Badge className={getStatusClass(order.order_status)} variant="secondary">
                          {order.order_status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.customer_name} • {order.customer_email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.fulfillment_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          {order.fulfillment_method === "pickup" ? (
                            <MapPin className="h-3 w-3" />
                          ) : (
                            <Truck className="h-3 w-3" />
                          )}
                          {order.fulfillment_method}
                        </span>
                        <span className="font-medium">${order.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
          statuses={statuses}
          onStatusUpdated={(updated) => {
            setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            setSelectedOrder(updated)
          }}
        />
      )}
    </div>
  )
}
