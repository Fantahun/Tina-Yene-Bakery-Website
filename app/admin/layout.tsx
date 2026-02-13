"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { Loader2 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === "/admin/login") {
      setIsLoading(false)
      return
    }

    // Check if user is authenticated
    const authenticated = sessionStorage.getItem("admin_authenticated")
    
    if (authenticated === "true") {
      setIsAuthenticated(true)
    } else {
      router.push("/admin/login")
    }
    
    setIsLoading(false)
  }, [pathname, router])

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Show login page without nav
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  // Show protected admin content
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav />
      <main className="flex-1 bg-muted/20">{children}</main>
    </div>
  )
}
