"use client"

import { useState, useEffect } from "react"
import { type Product, type Category } from "@/lib/mock-data"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface EditProductDialogProps {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditProductDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    category_id: product?.category_id || 0,
    price: product?.price || 0,
    prep_lead_time_days: product?.prep_lead_time_days || 0,
    pickup_allowed: product?.pickup_allowed ?? true,
    delivery_allowed: product?.delivery_allowed ?? true,
    is_active: product?.is_active ?? true,
  })

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true)
      try {
        const res = await fetch("/api/admin/categories")
        if (!res.ok) throw new Error("Failed to load categories")
        const data = (await res.json()) as Category[]
        setCategories(data)
        if (!product && data.length > 0 && formData.category_id === 0) {
          setFormData((prev) => ({ ...prev, category_id: data[0].id }))
        }
      } catch {
        setCategories([])
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [product])

  useEffect(() => {
    setFormData({
      name: product?.name || "",
      description: product?.description || "",
      image_url: product?.image_url || "",
      category_id: product?.category_id || 0,
      price: product?.price || 0,
      prep_lead_time_days: product?.prep_lead_time_days || 0,
      pickup_allowed: product?.pickup_allowed ?? true,
      delivery_allowed: product?.delivery_allowed ?? true,
      is_active: product?.is_active ?? true,
    })
  }, [product, open])

  const isDev = process.env.NODE_ENV === "development"
  const previewUrl = (() => {
    if (!formData.image_url) return ""
    if (!isDev) return formData.image_url
    if (!formData.image_url.startsWith("http")) return formData.image_url
    try {
      return new URL(formData.image_url).pathname || formData.image_url
    } catch {
      return formData.image_url
    }
  })()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...formData,
        id: product?.id,
      }

      const res = await fetch("/api/admin/products", {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save product")
      }

      toast.success(product ? "Product updated successfully" : "Product created successfully")
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save product"
      toast.error(message)
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
            {/* Category Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                    value={String(formData.category_id || "")}
                    onValueChange={(value) =>
                        setFormData({ ...formData, category_id: Number(value) })
                    }
                    disabled={isLoadingCategories}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder={isLoadingCategories ? "Loading..." : "Select a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

             {/*product url section*/}
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="e.g., /images/sourdough.jpg or https://example.com/image.jpg"
              />
            </div>

            {previewUrl ? (
              <div className="space-y-2">
                <Label>Preview</Label>
                <img
                  src={previewUrl}
                  alt="Product preview"
                  className="h-32 w-32 rounded-md border border-border object-cover"
                />
              </div>
            ) : null}

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
          <Button onClick={() => setIsConfirmOpen(true)} disabled={isSaving}>
            {isSaving ? "Saving..." : product ? "Update Product" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={product ? "Update product?" : "Create product?"}
        description={
          product
            ? "This will update the product details in your catalog."
            : "This will add the new product to your catalog."
        }
        confirmText={product ? "Update" : "Create"}
        onConfirm={handleSave}
      />
    </Dialog>
  )
}
