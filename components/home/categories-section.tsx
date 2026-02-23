"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

type Category = {
  id: string
  name: string
  slug: string
  image_url: string
}

export function CategoriesSection() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    let isMounted = true

    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Failed to load categories")
        }
        const data: Category[] = await response.json()
        if (isMounted) {
          setCategories(data)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setCategories([])
        }
      }
    }

    void loadCategories()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Our Menu
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
        {/*    No need of showing description paragraph for now - based on Tina's request on Feb 21, 2026  web correction document*/}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/shop?category=${category.slug}`}
            className="group relative overflow-hidden rounded-lg"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <Image
                src={category.image_url || "/placeholder.jpg"}
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
  )
}
