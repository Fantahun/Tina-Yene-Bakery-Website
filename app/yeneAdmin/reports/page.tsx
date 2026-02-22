"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { type OrderStatusEntry } from "@/lib/mock-data"

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

const pageSizes = [10, 20, 50]

type OrdersRow = {
  id: string
  confirmation_number: string
  customer_name: string
  customer_email: string
  fulfillment_method: string
  order_status: string
  payment_status: string
  total: number
  created_at: string
}

type ProductsRow = {
  product_name: string
  quantity: number
  revenue: number
  payment_status: string
  status_id: number | null
  fulfillment_method: string
}

type FulfillmentRow = {
  fulfillment_method: string
  orders: number
  revenue: number
  delivery_fees: number
  payment_status: string
  status_id: number | null
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState("orders")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState(getDateInputValue(-30))
  const [endDate, setEndDate] = useState(getDateInputValue(0))
  const [selectedPreset, setSelectedPreset] = useState("30")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [orders, setOrders] = useState<OrdersRow[]>([])
  const [products, setProducts] = useState<ProductsRow[]>([])
  const [fulfillment, setFulfillment] = useState<FulfillmentRow[]>([])
  const [statuses, setStatuses] = useState<OrderStatusEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  useEffect(() => {
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

    loadStatuses()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [activeTab, search, statusFilter, fulfillmentFilter, paymentStatusFilter, startDate, endDate, pageSize])

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

  const loadOrders = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("statusId", statusFilter)
      if (fulfillmentFilter && fulfillmentFilter !== "all") params.set("fulfillmentMethod", fulfillmentFilter)
      if (paymentStatusFilter && paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))

      const res = await fetch(`/api/admin/reports/orders?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to load orders report")
      }
      const data = await res.json()
      setOrders(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load orders report"
      setErrorMessage(message)
      setOrders([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProducts = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (paymentStatusFilter && paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))

      const res = await fetch(`/api/admin/reports/products?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to load products report")
      }
      const data = await res.json()
      setProducts(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load products report"
      setErrorMessage(message)
      setProducts([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFulfillment = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (paymentStatusFilter && paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))

      const res = await fetch(`/api/admin/reports/fulfillment?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to load fulfillment report")
      }
      const data = await res.json()
      setFulfillment(data.data ?? [])
      setTotal(data.total ?? 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load fulfillment report"
      setErrorMessage(message)
      setFulfillment([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "orders") {
      loadOrders()
    } else if (activeTab === "products") {
      loadProducts()
    } else {
      loadFulfillment()
    }
  }, [activeTab, search, statusFilter, fulfillmentFilter, paymentStatusFilter, startDate, endDate, page, pageSize])

  const statusLabelById = useMemo(() => {
    const map = new Map<number, string>()
    for (const status of statuses) {
      map.set(status.id, status.name)
    }
    return map
  }, [statuses])

  const exportReport = () => {
    const params = new URLSearchParams()
    if (startDate) params.set("startDate", startDate)
    if (endDate) params.set("endDate", endDate)
    if (paymentStatusFilter && paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter)
    if (search) params.set("search", search)

    if (activeTab === "orders") {
      if (statusFilter) params.set("statusId", statusFilter)
      if (fulfillmentFilter && fulfillmentFilter !== "all") params.set("fulfillmentMethod", fulfillmentFilter)
      params.set("format", "csv")
      window.location.href = `/api/admin/reports/orders?${params.toString()}`
      return
    }

    if (activeTab === "products") {
      if (statusFilter) params.set("statusId", statusFilter)
      if (fulfillmentFilter && fulfillmentFilter !== "all") params.set("fulfillmentMethod", fulfillmentFilter)
      params.set("format", "csv")
      window.location.href = `/api/admin/reports/products?${params.toString()}`
      return
    }

    if (statusFilter) params.set("statusId", statusFilter)
    params.set("format", "csv")
    window.location.href = `/api/admin/reports/fulfillment?${params.toString()}`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-muted-foreground">Analyze performance with detailed reports</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Report Filters</CardTitle>
          <CardDescription>Filter reports by date range and criteria</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="reports_start_date">Start Date</Label>
                <Input
                  id="reports_start_date"
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
                <Label htmlFor="reports_end_date">End Date</Label>
                <Input
                  id="reports_end_date"
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

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
            <div className="relative">
              <Label htmlFor="reports_search">Search (Orders)</Label>
              <Input
                id="reports_search"
                placeholder="Order number, customer, email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="All statuses" />
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
              <div className="space-y-2">
                <Label>Fulfillment</Label>
                <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-end justify-end">
              <Button onClick={exportReport} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="products">Product Sales</TabsTrigger>
          <TabsTrigger value="fulfillment">Fulfillment</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Report</CardTitle>
              <CardDescription>Detailed order listing with filters</CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : isLoading ? (
                <p className="text-sm text-muted-foreground">Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.confirmation_number}</TableCell>
                        <TableCell>
                          <div className="text-sm">{row.customer_name}</div>
                          <div className="text-xs text-muted-foreground">{row.customer_email}</div>
                        </TableCell>
                        <TableCell>{row.order_status}</TableCell>
                        <TableCell className="capitalize">{row.payment_status}</TableCell>
                        <TableCell className="capitalize">{row.fulfillment_method}</TableCell>
                        <TableCell className="text-right">${row.total.toFixed(2)}</TableCell>
                        <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizes.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Sales Report</CardTitle>
              <CardDescription>Top selling products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : isLoading ? (
                <p className="text-sm text-muted-foreground">Loading products...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No product sales data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((row) => (
                      <TableRow key={row.product_name}>
                        <TableCell className="font-medium">{row.product_name}</TableCell>
                        <TableCell className="capitalize">
                          {row.status_id ? statusLabelById.get(row.status_id) ?? "" : "All"}
                        </TableCell>
                        <TableCell className="capitalize">{row.payment_status}</TableCell>
                        <TableCell className="capitalize">{row.fulfillment_method}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizes.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fulfillment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fulfillment Report</CardTitle>
              <CardDescription>Pickup vs delivery performance</CardDescription>
            </CardHeader>
            <CardContent>
              {errorMessage ? (
                <p className="text-sm text-destructive">{errorMessage}</p>
              ) : isLoading ? (
                <p className="text-sm text-muted-foreground">Loading fulfillment...</p>
              ) : fulfillment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fulfillment data</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Delivery Fees</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fulfillment.map((row) => (
                      <TableRow key={row.fulfillment_method}>
                        <TableCell className="capitalize">{row.fulfillment_method}</TableCell>
                        <TableCell className="capitalize">
                          {row.status_id ? statusLabelById.get(row.status_id) ?? "" : "All"}
                        </TableCell>
                        <TableCell className="capitalize">{row.payment_status}</TableCell>
                        <TableCell className="text-right">{row.orders}</TableCell>
                        <TableCell className="text-right">${row.revenue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${row.delivery_fees.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue placeholder="Page size" />
                    </SelectTrigger>
                    <SelectContent>
                      {pageSizes.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size} / page
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

