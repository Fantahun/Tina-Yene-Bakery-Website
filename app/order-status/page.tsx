"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OrderStatusPage() {
  const router = useRouter()
  const [confirmationNumber, setConfirmationNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirmationNumber.trim()) return

    setIsLoading(true)
    // Redirect to the dynamic route
    router.push(`/order-status/${confirmationNumber.trim()}`)
  }

  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Track Your Order</CardTitle>
          <CardDescription>
            Enter your order confirmation number to check its status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="order-number" className="text-sm font-medium">
                Confirmation Number
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="order-number"
                  type="text"
                  placeholder="e.g. YB-ORD-208964-2B8-2603141200"
                  className="pl-9"
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You can find this in your order confirmation email.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Check Status"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
