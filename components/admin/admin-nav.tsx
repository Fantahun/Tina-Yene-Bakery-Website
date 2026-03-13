"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  Home,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  LogOut,
  ChevronRight,
  X,
  BarChart3,
  MessageSquare,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/yeneAdmin", label: "Dashboard", icon: Home, exact: true },
  { href: "/yeneAdmin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/yeneAdmin/products", label: "Products", icon: Package },
  { href: "/yeneAdmin/categories", label: "Categories", icon: Menu },
  { href: "/yeneAdmin/reports", label: "Reports", icon: BarChart3 },
  { href: "/yeneAdmin/messages", label: "Messages", icon: MessageSquare },
  { href: "/yeneAdmin/settings", label: "Settings", icon: Settings },
];

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const name = session?.user?.name || "Admin";

  const NavLinks = (
    <nav className="mt-6 space-y-1">
      {navItems.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setOpen(false)}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
     <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/">
          View Site
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
     </div>
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-between border-b border-border bg-background px-4 py-1 md:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">Welcome &nbsp;
            <span className="text-sm font-semibold">{name}</span> </p>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 border-r border-border bg-background/95 p-4 shadow-sm transition-transform duration-200 md:static md:h-auto md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="md:hidden h-16" />
        <div className="flex items-center justify-between">
          <Link href="/yeneAdmin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-sm font-bold">TB</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Welcome</p>
              <p className="text-sm font-semibold">{name}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {NavLinks}

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => signOut({ callbackUrl: "/yeneAdmin/login" })}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
