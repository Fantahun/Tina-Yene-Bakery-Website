"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Menu } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/store/hooks"
import { selectCartItemCount, selectCartHydrated } from "@/store/cart-slice"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./mobile-nav"
import Image from "next/image";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  {href: "/custom-cakes", label: "Custom Cakes"},
  {href: "/order-status", label: "Track Order"},
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

export function Header() {
  const pathname = usePathname()
  const cartItemCount = useAppSelector(selectCartItemCount)
  const hydrated = useAppSelector(selectCartHydrated)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Don't show header on admin pages
  if (pathname.startsWith("/admin")) return null

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/*<span className="text-2xl font-bold tracking-tight text-foreground">*/}
            {/*  Yene<span className="text-primary">Bakery</span>*/}
            {/*</span>*/}
            <Image src="/images/logo/yene-bakery-logo-nav.jpg"
                   alt="YeneBakery"
                   width={170}
                   height={44}
                   priority className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/cart" className="relative" aria-label={`Cart with ${cartItemCount} items`}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
                {hydrated && cartItemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {cartItemCount > 99 ? "99+" : cartItemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </>
  )
}
