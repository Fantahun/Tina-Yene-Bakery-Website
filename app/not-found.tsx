import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Home, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
        <div className="relative h-48 w-full">
          <Image
            src="/images/about-bakery.jpg"
            alt="YeneBakery shelves of fresh bread"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-foreground/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-background">
            <p className="text-sm uppercase tracking-[0.25em]">404</p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Page not found</h1>
            <p className="mt-2 text-sm sm:text-base">Looks like this page is off the menu.</p>
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            The link you followed is missing or broken. Try heading back to the shop or home page.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild variant="secondary" className="gap-2 w-full sm:w-auto">
              <Link href="/">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button asChild className="gap-2 w-full sm:w-auto">
              <Link href="/shop">
                <ShoppingBag className="h-4 w-4" />
                Browse menu
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2 w-full sm:w-auto">
              <Link href="/contact">
                <ArrowLeft className="h-4 w-4" />
                Contact us
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
