"use client"

import { useEffect, useState } from "react"
import { type OrderStatusEntry } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

interface EditOrderStatusDialogProps {
  status: OrderStatusEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function EditOrderStatusDialog({
  status,
  open,
  onOpenChange,
  onSaved,
}: EditOrderStatusDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: status?.name || "",
    description: status?.description || "",
    sort_order: status?.sort_order || 0,
    is_active: status?.is_active ?? true,
  })

  useEffect(() => {
    setFormData({
      name: status?.name || "",
      description: status?.description || "",
      sort_order: status?.sort_order || 0,
      is_active: status?.is_active ?? true,
    })
  }, [status, open])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        id: status?.id,
      }

      const res = await fetch("/api/admin/order-statuses", {
        method: status ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save status")
      }

      toast.success(status ? "Status updated successfully" : "Status created successfully")
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save status"
      toast.error(message)
    } finally {
      setIsSaving(false)
      setIsConfirmOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{status ? "Edit Order Status" : "Add Order Status"}</DialogTitle>
          <DialogDescription>
            {status ? "Update the status details" : "Create a new order status"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status_name">Status Name</Label>
            <Input
              id="status_name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Ready for Pickup"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status_description">Description</Label>
            <Textarea
              id="status_description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Notes for admins..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status_sort_order">Sort Order</Label>
              <Input
                id="status_sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) })
                }
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="status_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this status available in admin views
                </p>
              </div>
              <Switch
                id="status_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsConfirmOpen(true)} disabled={isSaving}>
            {isSaving ? "Saving..." : status ? "Update Status" : "Create Status"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={status ? "Update status?" : "Create status?"}
        description={
          status
            ? "This will update the order status details."
            : "This will add the new order status."
        }
        confirmText={status ? "Update" : "Create"}
        onConfirm={handleSave}
      />
    </Dialog>
  )
}

