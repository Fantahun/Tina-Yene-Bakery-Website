import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Custom Cakes | Yene Bakery",
  description: "Order a custom cake made for your celebration.",
}

export default function CustomCakesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Custom Cakes
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Celebrate your moments with a cake made just for you
          </h1>
          <p className="mt-4 text-pretty text-base text-muted-foreground">
            Share your theme, size, and flavors. We will craft a custom cake that
            fits your celebration, style, and budget. Perfect for birthdays,
            weddings, graduations, and more.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/shop?category=custom-orders">Start a Custom Order</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">Ask a Question</Link>
            </Button>
          </div>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted">
          <Image
            src="/images/custom-cake.jpg"
            alt="Custom cake display"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
            priority
          />
        </div>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Tell us the details</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Share your occasion, guest count, and any inspiration photos. We will
            recommend the right size and design.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Pick flavors</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose from our signature cake bases, fillings, and frosting options.
            We can also accommodate dietary requests when possible.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Confirm the order</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We will share a final quote and pickup or delivery details. After
            approval, your custom cake goes into production.
          </p>
        </div>
      </div>
    </div>
  )
}
