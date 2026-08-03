import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { ShopCategory } from "@/lib/shop-types";
import { CatalogueImage } from "@/components/ui/catalogue-image";

interface CategoriesSectionProps {
  categories: ShopCategory[];
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Our Menu
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            className="group relative overflow-hidden rounded-lg"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <CatalogueImage
                src={category.image_url}
                alt={category.name}
                width={600}
                height={450}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent p-5">
              <h3 className="text-lg font-semibold text-background">
                {category.name}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-sm text-background/80 transition-colors group-hover:text-background">
                <span>Explore</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
