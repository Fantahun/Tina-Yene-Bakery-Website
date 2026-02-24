"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {useEffect, useState} from "react";

type Category = {
  id: string
  name: string
  slug: string
  image_url: string
}
export function Footer() {
  const pathname = usePathname();

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
  // Don't show footer on admin pages
  if (pathname.startsWith("/yeneAdmin")) return null;

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <span className="text-xl font-bold tracking-tight">
              Yene<span className="text-primary">Bakery</span>
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Handcrafted cakes and pastries made with care. From our kitchen to your table, every bite is created to bring joy.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2" aria-label="Footer navigation">
              <Link
                href="/shop"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Shop All
              </Link>

              {
               categories.map((category: Category) => (
                   <Link
                       key={category.id}
                       href={`/shop/${category.slug}`}
                     className="text-sm text-muted-foreground transition-colors hover:text-primary"
                     >
                     ${category.name}
                   </Link>
               ))}

            </nav>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              Contact Us
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  123 Baker Street, Suite 100, Downtown
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  (555) 123-4567
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-sm text-muted-foreground">
                  hello@YeneBakery.com
                </span>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Hours</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">
                    Mon-Fri: 7am - 7pm
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Saturday: 8am - 6pm
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Sunday: 8am - 4pm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            {new Date().getFullYear()} YeneBakery. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              Terms of Service
            </Link>
          </div>
          <div className="flex">
            <p className="text-sm text-muted-foreground">
              Designed &amp; Developed by:&nbsp;
            <Link
                href="https://fantahun.net/" target="_blank"
                className="text-sm text-muted-foreground transition-colors hover:text-primary underline"
            >
               Fantahun Bishaw
            </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
