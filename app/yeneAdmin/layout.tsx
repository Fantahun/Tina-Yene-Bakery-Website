"use client"

import { ReactNode, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { SessionProvider, useSession } from "next-auth/react"
import { Loader2 } from "lucide-react"

import { AdminNav } from "@/components/admin/admin-nav"

function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const isLoginPage = pathname === "/yeneAdmin/login"

  useEffect(() => {
    if (!isLoginPage && status === "unauthenticated") {
      router.replace("/yeneAdmin/login")
    }
  }, [isLoginPage, status, router])

  if (isLoginPage) return <>{children}</>
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (status !== "authenticated") return null

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-muted/20">
        <AdminNav />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </SessionProvider>
  )
}

export default function YeneAdminLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </SessionProvider>
  )
}
