"use client"

import { cn } from "@/lib/utils"
import { categories } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"

interface CategoryFilterProps {
  selected: string | null
  onSelect: (slug: string | null) => void
}

export function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
      <Button
        variant={selected === null ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full",
          selected === null && "shadow-sm"
        )}
      >
        All
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selected === category.slug ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(category.slug)}
          className={cn(
            "rounded-full",
            selected === category.slug && "shadow-sm"
          )}
        >
          {category.name}
        </Button>
      ))}
    </div>
  )
}
