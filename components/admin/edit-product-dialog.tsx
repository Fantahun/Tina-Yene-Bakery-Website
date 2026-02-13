"use client"

import { useState } from "react"
import { type Product } from "@/lib/mock-data"
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
import { toast } from "sonner"

interface EditProductDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: EditProductDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price || 0,
    prep_lead_time_days: product?.prep_lead_time_days || 0,
    pickup_allowed: product?.pickup_allowed ?? true,
    delivery_allowed: product?.delivery_allowed ?? true,
    is_active: product?.is_active ?? true,
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // In production, this would call an API to save the product
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success(product ? "Product updated successfully" : "Product created successfully")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to save product")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Update product details and availability"
              : "Create a new product for your bakery"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Sourdough Loaf"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your product..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: parseFloat(e.target.value) })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead_time">Preparation Lead Time (days)</Label>
                <Input
                  id="lead_time"
                  type="number"
                  min="0"
                  value={formData.prep_lead_time_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      prep_lead_time_days: parseInt(e.target.value),
                    })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  0 = Same-day allowed, 1 = Next-day, 2+ = Advance order
                </p>
              </div>
            </div>
          </div>

          {/* Fulfillment Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Fulfillment Options
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="pickup">Pickup Allowed</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow customers to pick up this item
                  </p>
                </div>
                <Switch
                  id="pickup"
                  checked={formData.pickup_allowed}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, pickup_allowed: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="delivery">Delivery Allowed</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow delivery for this item
                  </p>
                </div>
                <Switch
                  id="delivery"
                  checked={formData.delivery_allowed}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, delivery_allowed: checked })
                  }
                />
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Product Availability
            </h3>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Make this product visible to customers
                </p>
              </div>
              <Switch
                id="active"
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
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : product ? "Update Product" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
