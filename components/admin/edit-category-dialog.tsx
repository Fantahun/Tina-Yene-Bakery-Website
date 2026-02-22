"use client"

import { useEffect, useState } from "react"
import { type Category } from "@/lib/mock-data"
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

interface EditCategoryDialogProps {
  category: Category | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function EditCategoryDialog({
  category,
  open,
  onOpenChange,
  onSaved,
}: EditCategoryDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: category?.name || "",
    description: category?.description || "",
    image_url: category?.image_url || "",
    sort_order: category?.sort_order || 0,
    is_active: category?.is_active ?? true,
  })

  useEffect(() => {
    setFormData({
      name: category?.name || "",
      description: category?.description || "",
      image_url: category?.image_url || "",
      sort_order: category?.sort_order || 0,
      is_active: category?.is_active ?? true,
    })
  }, [category, open])

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
        id: category?.id,
      }

      const res = await fetch("/api/admin/categories", {
        method: category ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "Failed to save category")
      }

      toast.success(category ? "Category updated successfully" : "Category created successfully")
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save category"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Add New Category"}</DialogTitle>
          <DialogDescription>
            {category ? "Update category details" : "Create a new category"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Artisan Breads"
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
                placeholder="Describe this category..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData({ ...formData, image_url: e.target.value })
                }
                placeholder="e.g., /images/cat-breads.jpg or https://example.com/image.jpg"
              />
            </div>

            {previewUrl ? (
              <div className="space-y-2">
                <Label>Preview</Label>
                <img
                  src={previewUrl}
                  alt="Category preview"
                  className="h-32 w-32 rounded-md border border-border object-cover"
                />
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
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
                  <Label htmlFor="active">Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this category visible to customers
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => setIsConfirmOpen(true)} disabled={isSaving}>
            {isSaving ? "Saving..." : category ? "Update Category" : "Create Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={category ? "Update category?" : "Create category?"}
        description={
          category
            ? "This will update the category details."
            : "This will add the new category to your catalog."
        }
        confirmText={category ? "Update" : "Create"}
        onConfirm={handleSave}
      />
    </Dialog>
  )
}

