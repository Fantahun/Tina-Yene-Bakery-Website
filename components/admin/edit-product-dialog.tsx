"use client";

import { useState, useEffect } from "react";
import { type Product, type Category, type ProductSize } from "@/lib/mock-data";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ImageUrlField } from "@/components/admin/image-url-field";

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function EditProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: EditProductDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    category_id: product?.category_id || 0,
    price: product?.price || 0,
    has_sizes: product?.has_sizes ?? false,
    sizes: product?.sizes ?? [],
    prep_lead_time_days: product?.prep_lead_time_days || 0,
    pickup_allowed: product?.pickup_allowed ?? true,
    delivery_allowed: product?.delivery_allowed ?? true,
    is_active: product?.is_active ?? true,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const res = await fetch("/api/admin/categories");
        if (!res.ok) throw new Error("Failed to load categories");
        const data = (await res.json()) as Category[];
        setCategories(data);
        if (!product && data.length > 0 && formData.category_id === 0) {
          setFormData((prev) => ({ ...prev, category_id: data[0].id }));
        }
      } catch {
        setCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [product]);

  useEffect(() => {
    setFormData({
      name: product?.name || "",
      description: product?.description || "",
      image_url: product?.image_url || "",
      category_id: product?.category_id || 0,
      price: product?.price || 0,
      has_sizes: product?.has_sizes ?? false,
      sizes: product?.sizes ?? [],
      prep_lead_time_days: product?.prep_lead_time_days || 0,
      pickup_allowed: product?.pickup_allowed ?? true,
      delivery_allowed: product?.delivery_allowed ?? true,
      is_active: product?.is_active ?? true,
    });
  }, [product, open]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        id: product?.id,
        sizes: formData.sizes.map((size, index) => ({
          id: size.id,
          name: size.name,
          serves: size.serves,
          price: size.price,
          is_active: size.is_active,
          sort_order: Number.isFinite(size.sort_order)
            ? size.sort_order
            : index,
        })),
      };

      const res = await fetch("/api/admin/products", {
        method: product ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to save product");
      }

      toast.success(
        product
          ? "Product updated successfully"
          : "Product created successfully",
      );
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save product";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const addSizeRow = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [
        ...prev.sizes,
        {
          name: "",
          serves: "",
          price: 0,
          is_active: true,
          sort_order: prev.sizes.length,
        },
      ],
    }));
  };

  const updateSizeRow = (index: number, patch: Partial<ProductSize>) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.map((size, rowIndex) =>
        rowIndex === index ? { ...size, ...patch } : size,
      ),
    }));
  };

  const removeSizeRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes
        .filter((_, rowIndex) => rowIndex !== index)
        .map((size, rowIndex) => ({ ...size, sort_order: rowIndex })),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Product" : "Add New Product"}
          </DialogTitle>
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
                    <SelectValue
                      placeholder={
                        isLoadingCategories ? "Loading..." : "Select a category"
                      }
                    />
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
            <ImageUrlField
              value={formData.image_url}
              onChange={(image_url) => setFormData({ ...formData, image_url })}
              subject="Product"
            />

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
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value),
                    })
                  }
                  placeholder="0.00"
                  disabled={formData.has_sizes}
                />
                {formData.has_sizes ? (
                  <p className="text-xs text-muted-foreground">
                    Base price is disabled when size pricing is enabled.
                  </p>
                ) : null}
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

            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="has_sizes">
                    This product has size options
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use size-specific pricing and serving ranges.
                  </p>
                </div>
                <Switch
                  id="has_sizes"
                  checked={formData.has_sizes}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      has_sizes: checked,
                      sizes:
                        checked && prev.sizes.length === 0
                          ? [
                              {
                                name: "Small",
                                serves: "",
                                price: 0,
                                is_active: true,
                                sort_order: 0,
                              },
                            ]
                          : prev.sizes,
                    }))
                  }
                />
              </div>

              {formData.has_sizes ? (
                <div className="space-y-3">
                  {formData.sizes.map((size, index) => (
                    <div
                      key={`${size.id ?? "new"}-${index}`}
                      className="space-y-3 rounded-md border border-border p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <Label>Size Name</Label>
                          <Input
                            value={size.name}
                            onChange={(e) =>
                              updateSizeRow(index, { name: e.target.value })
                            }
                            placeholder="e.g., 1/4 Sheet"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Price ($)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={size.price}
                            onChange={(e) =>
                              updateSizeRow(index, {
                                price: Number(e.target.value) || 0,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Serves</Label>
                          <Input
                            value={size.serves ?? ""}
                            onChange={(e) =>
                              updateSizeRow(index, { serves: e.target.value })
                            }
                            placeholder="12 - 14 people"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={size.is_active}
                            onCheckedChange={(checked) =>
                              updateSizeRow(index, { is_active: checked })
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            Active
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSizeRow(index)}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSizeRow}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Size
                  </Button>
                </div>
              ) : null}
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
            {isSaving
              ? "Saving..."
              : product
                ? "Update Product"
                : "Create Product"}
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
  );
}
