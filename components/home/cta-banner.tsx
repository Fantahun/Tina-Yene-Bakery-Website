"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function CtaBanner() {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
            Custom Cakes for Your Special Moments
          </h2>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-primary-foreground/90">
            Perfect for birthdays, weddings, and all your celebrations.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="font-semibold"
          >
            <Link href="/custom-cakes">
              Order a Custom Cake
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
