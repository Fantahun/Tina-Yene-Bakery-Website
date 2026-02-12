"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CtaBanner() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
            Planning a Special Event?
          </h2>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-primary-foreground/90">
            From wedding cakes to corporate catering, our custom orders are made to make your celebrations unforgettable.
            Order at least 3 days in advance for custom creations.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="font-semibold"
          >
            <Link href="/shop?category=custom-orders">
              Explore Custom Orders
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
