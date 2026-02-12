"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { products, categories } from "@/lib/mock-data"
import { CategoryFilter } from "@/components/products/category-filter"
import { ProductGrid } from "@/components/products/product-grid"
import { Input } from "@/components/ui/input"

export default function ShopPage() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory
  )
  const [searchQuery, setSearchQuery] = useState("")

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
          p.description.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [selectedCategory, searchQuery])

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
