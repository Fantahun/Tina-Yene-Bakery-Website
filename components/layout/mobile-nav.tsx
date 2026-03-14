"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, Home, Store, Info, Phone,CakeIcon, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/store/hooks"
import { selectCartItemCount, selectCartHydrated } from "@/store/cart-slice"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import Image from "next/image"

const navLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/shop", label: "Shop", icon: Store },
  {href: "/custom-cakes", label: "Custom Cakes", icon: CakeIcon},
  { href: "/order-status", label: "Track Order", icon: Search },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
]

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname()
  const cartItemCount = useAppSelector(selectCartItemCount)
  const hydrated = useAppSelector(selectCartHydrated)

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle className="text-left text-xl font-bold tracking-tight">
            <Image
              src="/images/logo/yene-bakery-logo-nav.jpg"
              alt="YeneBakery"
              width={170}
              height={44}
              priority
              className="h-10 w-auto"
            />
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col py-4" aria-label="Mobile navigation">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-muted",
                  pathname === link.href
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
                {link.href === "/cart" && hydrated && cartItemCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
