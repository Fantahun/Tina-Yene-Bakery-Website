"use client";

import { useEffect, useState } from "react";
import { Edit, Package, Plus, Search, Trash2 } from "lucide-react";

import { EditProductDialog } from "@/components/admin/edit-product-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Product } from "@/lib/mock-data";

export default function AdminProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to load products");
      }
      const data = (await res.json()) as Product[];
      setProducts(data);
    } catch (error) {
      setProducts([]);
      const message =
        error instanceof Error ? error.message : "Failed to load products";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productToDelete.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete product");
      }
      setProductToDelete(null);
      await loadProducts();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete product";
      setErrorMessage(message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your bakery products and inventory
          </p>
        </div>
        <Button onClick={() => setIsAddingNew(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Search Products</CardTitle>
          <CardDescription>Find products by name or category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {errorMessage ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Unable to load products
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Loading products
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">Please wait</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                No products found
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-center">Lead Time</TableHead>
                  <TableHead className="text-center">Pickup</TableHead>
                  <TableHead className="text-center">Delivery</TableHead>
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {product.name}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description.substring(0, 50)}...
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {product.has_sizes &&
                      product.sizes &&
                      product.sizes.some((size) => size.is_active) ? (
                        <div>
                          <p>
                            From $
                            {Math.min(
                              ...product.sizes
                                .filter((size) => size.is_active)
                                .map((size) => size.price),
                            ).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {
                              product.sizes.filter((size) => size.is_active)
                                .length
                            }{" "}
                            active size
                            {product.sizes.filter((size) => size.is_active)
                              .length === 1
                              ? ""
                              : "s"}
                          </p>
                        </div>
                      ) : (
                        <>${product.price.toFixed(2)}</>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={
                          product.prep_lead_time_days === 0
                            ? "default"
                            : "secondary"
                        }
                      >
                        {product.prep_lead_time_days}{" "}
                        {product.prep_lead_time_days === 1 ? "day" : "days"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={product.pickup_allowed} disabled />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={product.delivery_allowed} disabled />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={product.is_active} disabled />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setProductToDelete(product)}
                        >
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

      {(selectedProduct || isAddingNew) && (
        <EditProductDialog
          product={selectedProduct}
          open={!!(selectedProduct || isAddingNew)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProduct(null);
              setIsAddingNew(false);
            }
          }}
          onSaved={loadProducts}
        />
      )}

      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={(open) => {
          if (!open) setProductToDelete(null);
        }}
        title="Delete product?"
        description="This will remove the product from the admin list."
        confirmText="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
