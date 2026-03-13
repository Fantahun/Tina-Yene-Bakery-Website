"use client"

import { useEffect, useState } from "react"
import { Edit, Clock, DollarSign, MapPin, Plus, RefreshCw, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EditOrderStatusDialog } from "@/components/admin/edit-order-status-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type PickupLocation, type OrderStatusEntry } from "@/lib/mock-data"
import { PUBLIC_REVALIDATE_OPTIONS } from "@/lib/isr"
import { toast } from "sonner"

export default function AdminSettingsPage() {
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isSavingLocations, setIsSavingLocations] = useState(false)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [confirmSettingsOpen, setConfirmSettingsOpen] = useState(false)
  const [confirmLocationsOpen, setConfirmLocationsOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<PickupLocation | null>(null)
  const [statusToDelete, setStatusToDelete] = useState<OrderStatusEntry | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<OrderStatusEntry | null>(null)
  const [isAddingStatus, setIsAddingStatus] = useState(false)
  const [statusesError, setStatusesError] = useState<string | null>(null)
  const [revalidateTarget, setRevalidateTarget] = useState<(typeof PUBLIC_REVALIDATE_OPTIONS)[number]["value"]>("all")
  const [revalidateSlug, setRevalidateSlug] = useState("")

  const [settings, setSettings] = useState({
    cutoff_time: "",
    delivery_fee: 0,
    min_order_delivery: 0,
    store_phone: "",
    store_email: "",
    dashboard_pending_status_id: null as number | null,
    dashboard_in_progress_status_id: null as number | null,
    dashboard_ready_status_id: null as number | null,
  })

  const [locations, setLocations] = useState<PickupLocation[]>([])
  const [orderStatuses, setOrderStatuses] = useState<OrderStatusEntry[]>([])

  const loadSettings = async () => {
    setSettingsError(null)
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setSettingsError(data?.error || "Failed to load settings")
        return
      }
      const data = await res.json()
      setSettings(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load settings"
      setSettingsError(message)
    }
  }

  const loadLocations = async () => {
    setLocationsError(null)
    try {
      const res = await fetch("/api/admin/pickup-locations")
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setLocationsError(data?.error || "Failed to load locations")
        return
      }
      const data = (await res.json()) as PickupLocation[]
      setLocations(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load locations"
      setLocationsError(message)
    }
  }

  const loadOrderStatuses = async () => {
    setStatusesError(null)
    try {
      const res = await fetch("/api/admin/order-statuses")
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setStatusesError(data?.error || "Failed to load order statuses")
        return
      }
      const data = (await res.json()) as OrderStatusEntry[]
      setOrderStatuses(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load order statuses"
      setStatusesError(message)
    }
  }

  useEffect(() => {
    loadSettings()
    loadLocations()
    loadOrderStatuses()
  }, [])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || "Failed to save settings")
        return
      }

      const data = await res.json()
      setSettings(data)
      toast.success("Settings saved successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings"
      toast.error(message)
    } finally {
      setIsSavingSettings(false)
      setConfirmSettingsOpen(false)
    }
  }

  const handleSaveLocations = async () => {
    setIsSavingLocations(true)
    try {
      for (const location of locations) {
        const isNew = !Number.isFinite(location.id) || location.id <= 0
        const endpoint = "/api/admin/pickup-locations"
        const method = isNew ? "POST" : "PUT"
        const payload = {
          id: isNew ? undefined : location.id,
          name: location.name,
          address: location.address,
          is_active: location.is_active,
        }

        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          toast.error(data?.error || "Failed to save locations")
          return
        }
      }

      await loadLocations()
      toast.success("Locations saved successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save locations"
      toast.error(message)
    } finally {
      setIsSavingLocations(false)
      setConfirmLocationsOpen(false)
    }
  }

  const handleAddLocation = () => {
    const tempId = Math.min(0, ...locations.map((l) => l.id ?? 0)) - 1
    const newLocation = {
      id: tempId,
      name: "New Location",
      address: "Enter address",
      is_active: true,
    }
    setLocations([...locations, newLocation])
  }

  const handleRemoveLocation = (location: PickupLocation) => {
    if (location.id <= 0) {
      setLocations(locations.filter((l) => l.id !== location.id))
      return
    }
    setLocationToDelete(location)
  }

  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return
    try {
      const res = await fetch("/api/admin/pickup-locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: locationToDelete.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || "Failed to delete location")
        return
      }
      setLocationToDelete(null)
      await loadLocations()
      toast.success("Location removed")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete location"
      toast.error(message)
    }
  }

  const confirmDeleteStatus = async () => {
    if (!statusToDelete) return
    try {
      const res = await fetch("/api/admin/order-statuses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: statusToDelete.id }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || "Failed to delete status")
        return
      }
      setStatusToDelete(null)
      await loadOrderStatuses()
      toast.success("Status removed")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete status"
      toast.error(message)
    }
  }

  const handleManualRevalidate = async () => {
    setIsRevalidating(true)
    try {
      const response = await fetch("/api/revalidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: revalidateTarget,
          slug: revalidateTarget === "product" ? revalidateSlug : undefined,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error(data?.error || "Failed to revalidate public pages")
        return
      }

      const pathLabel = Array.isArray(data?.paths) ? data.paths.join(", ") : "selected pages"
      toast.success(`Revalidation queued for ${pathLabel}`)
      if (revalidateTarget === "product") {
        setRevalidateSlug("")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revalidate public pages"
      toast.error(message)
    } finally {
      setIsRevalidating(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-muted-foreground">Configure your bakery operations</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure cutoff times and delivery options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {settingsError}
              </div>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cutoff_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Same-Day Cutoff Time
                </Label>
                <Input
                  id="cutoff_time"
                  type="time"
                  value={settings.cutoff_time}
                  onChange={(e) => setSettings({ ...settings, cutoff_time: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Orders placed after this time will be scheduled for the next day
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_fee" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Delivery Fee ($)
                </Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.delivery_fee}
                  onChange={(e) => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="min_order" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Minimum Order for Delivery ($)
                </Label>
                <Input
                  id="min_order"
                  type="number"
                  step="0.01"
                  min="0"
                  value={settings.min_order_delivery}
                  onChange={(e) => setSettings({ ...settings, min_order_delivery: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="store_phone">Store Phone</Label>
                <Input
                  id="store_phone"
                  type="tel"
                  value={settings.store_phone}
                  onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store_email">Store Email</Label>
                <Input
                  id="store_email"
                  type="email"
                  value={settings.store_email}
                  onChange={(e) => setSettings({ ...settings, store_email: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setConfirmSettingsOpen(true)} disabled={isSavingSettings} className="gap-2">
                <Save className="h-4 w-4" />
                {isSavingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Pickup Locations
                </CardTitle>
                <CardDescription>Manage store pickup locations</CardDescription>
              </div>
              <Button onClick={handleAddLocation} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locationsError ? (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {locationsError}
              </div>
            ) : null}
            <div className="space-y-4">
              {locations.map((location, index) => (
                <div key={location.id} className="flex items-start gap-4 rounded-lg border border-border p-4">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor={`location_name_${location.id}`}>Location Name</Label>
                      <Input
                        id={`location_name_${location.id}`}
                        value={location.name}
                        onChange={(e) => {
                          const updated = [...locations]
                          updated[index].name = e.target.value
                          setLocations(updated)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`location_address_${location.id}`}>Address</Label>
                      <Input
                        id={`location_address_${location.id}`}
                        value={location.address}
                        onChange={(e) => {
                          const updated = [...locations]
                          updated[index].address = e.target.value
                          setLocations(updated)
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`location_active_${location.id}`}
                          checked={location.is_active}
                          onCheckedChange={(checked) => {
                            const updated = [...locations]
                            updated[index].is_active = checked
                            setLocations(updated)
                          }}
                        />
                        <Label htmlFor={`location_active_${location.id}`}>Active</Label>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveLocation(location)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setConfirmLocationsOpen(true)} disabled={isSavingLocations} className="gap-2">
                <Save className="h-4 w-4" />
                {isSavingLocations ? "Saving..." : "Save Locations"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Statuses</CardTitle>
                <CardDescription>Manage admin order status labels</CardDescription>
              </div>
              <Button onClick={() => setIsAddingStatus(true)} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Status
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {statusesError ? (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {statusesError}
              </div>
            ) : null}
            {orderStatuses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm text-muted-foreground">No order statuses found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Sort</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="font-medium">{status.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {status.description || "No description"}
                      </TableCell>
                      <TableCell className="text-center">{status.sort_order}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={status.is_active} disabled />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedStatus(status)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setStatusToDelete(status)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard Cards</CardTitle>
            <CardDescription>Select which statuses power the dashboard cards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dashboard_pending_status">Pending Card</Label>
                <Select
                  value={settings.dashboard_pending_status_id ? String(settings.dashboard_pending_status_id) : ""}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      dashboard_pending_status_id: value ? Number(value) : null,
                    })
                  }
                >
                  <SelectTrigger id="dashboard_pending_status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.id} value={String(status.id)}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard_in_progress_status">In Progress Card</Label>
                <Select
                  value={settings.dashboard_in_progress_status_id ? String(settings.dashboard_in_progress_status_id) : ""}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      dashboard_in_progress_status_id: value ? Number(value) : null,
                    })
                  }
                >
                  <SelectTrigger id="dashboard_in_progress_status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.id} value={String(status.id)}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard_ready_status">Ready Card</Label>
                <Select
                  value={settings.dashboard_ready_status_id ? String(settings.dashboard_ready_status_id) : ""}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      dashboard_ready_status_id: value ? Number(value) : null,
                    })
                  }
                >
                  <SelectTrigger id="dashboard_ready_status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.id} value={String(status.id)}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setConfirmSettingsOpen(true)} disabled={isSavingSettings} className="gap-2">
                <Save className="h-4 w-4" />
                {isSavingSettings ? "Saving..." : "Save Dashboard Cards"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public Page Revalidation</CardTitle>
            <CardDescription>
              Trigger on-demand ISR after catalog or content updates. Visitors keep seeing the current cached page until the fresh version is ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label htmlFor="revalidate_target">Page Target</Label>
                <Select value={revalidateTarget} onValueChange={(value) => setRevalidateTarget(value as (typeof PUBLIC_REVALIDATE_OPTIONS)[number]["value"])}>
                  <SelectTrigger id="revalidate_target">
                    <SelectValue placeholder="Select page target" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLIC_REVALIDATE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="revalidate_slug">Product Slug</Label>
                <Input
                  id="revalidate_slug"
                  value={revalidateSlug}
                  onChange={(e) => setRevalidateSlug(e.target.value)}
                  placeholder="Required only for single product pages"
                  disabled={revalidateTarget !== "product"}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleManualRevalidate}
                disabled={isRevalidating || (revalidateTarget === "product" && !revalidateSlug.trim())}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRevalidating ? "animate-spin" : ""}`} />
                {isRevalidating ? "Revalidating..." : "Revalidate Public Pages"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmSettingsOpen}
        onOpenChange={setConfirmSettingsOpen}
        title="Save settings?"
        description="This will update your bakery settings."
        confirmText="Save"
        onConfirm={handleSaveSettings}
      />

      <ConfirmDialog
        open={confirmLocationsOpen}
        onOpenChange={setConfirmLocationsOpen}
        title="Save pickup locations?"
        description="This will update your pickup locations."
        confirmText="Save"
        onConfirm={handleSaveLocations}
      />

      <ConfirmDialog
        open={!!locationToDelete}
        onOpenChange={(open) => {
          if (!open) setLocationToDelete(null)
        }}
        title="Delete location?"
        description="This will remove the pickup location from the list."
        confirmText="Delete"
        onConfirm={confirmDeleteLocation}
      />

      {(selectedStatus || isAddingStatus) && (
        <EditOrderStatusDialog
          status={selectedStatus}
          open={!!(selectedStatus || isAddingStatus)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedStatus(null)
              setIsAddingStatus(false)
            }
          }}
          onSaved={loadOrderStatuses}
        />
      )}

      <ConfirmDialog
        open={!!statusToDelete}
        onOpenChange={(open) => {
          if (!open) setStatusToDelete(null)
        }}
        title="Delete status?"
        description="This will remove the order status from the list."
        confirmText="Delete"
        onConfirm={confirmDeleteStatus}
      />
    </div>
  )
}

