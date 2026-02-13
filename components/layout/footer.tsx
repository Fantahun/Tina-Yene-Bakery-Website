"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const pathname = usePathname();

  // Don't show footer on admin pages
  if (pathname.startsWith("/admin")) return null;

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
              Handcrafted baked goods made with love and the finest ingredients.
              From our ovens to your table, every bite tells a story.
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
              <Link
                href="/shop?category=artisan-breads"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Artisan Breads
              </Link>
              <Link
                href="/shop?category=cakes-pastries"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Cakes & Pastries
              </Link>
              <Link
                href="/shop?category=custom-orders"
                className="text-sm text-muted-foreground transition-colors hover:text-primary"
              >
                Custom Orders
              </Link>
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
        </div>
      </div>
    </footer>
  );
}
