"use client"

import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { CategoryFilter } from "@/components/products/category-filter"
import { ProductGrid } from "@/components/products/product-grid"
import { Input } from "@/components/ui/input"
import type { ShopCategory, ShopProduct } from "@/lib/shop-types"

interface ShopPageClientProps {
  initialCategory: string | null
}

export function ShopPageClient({ initialCategory }: ShopPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory,
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [products, setProducts] = useState<ShopProduct[]>([])

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const [categoriesResponse, productsResponse] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
        ])

        if (!categoriesResponse.ok || !productsResponse.ok) {
          throw new Error("Failed to load shop data")
        }

        const [categoriesData, productsData] = await Promise.all([
          categoriesResponse.json() as Promise<ShopCategory[]>,
          productsResponse.json() as Promise<ShopProduct[]>,
        ])

        if (isMounted) {
          setCategories(categoriesData)
          setProducts(productsData)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setCategories([])
          setProducts([])
        }
      }
    }

    void loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.is_active)

    if (selectedCategory) {
      const cat = categories.find((c) => c.slug === selectedCategory)
      if (cat) {
        filtered = filtered.filter((p) => p.category_id === cat.id)
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [categories, products, selectedCategory, searchQuery])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
          Our Shop
        </h1>
        <p className="mt-2 text-muted-foreground">
          Browse our full selection of handcrafted baked goods
        </p>
      </div>

      {/* Filters & Search */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CategoryFilter
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          categories={categories}
        />
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Results Count */}
      <p className="mb-4 text-sm text-muted-foreground">
        {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}
        {selectedCategory
          ? ` in ${categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}`
          : ""}
      </p>

      {/* Product Grid */}
      <ProductGrid products={filteredProducts} />
    </div>
  )
}
