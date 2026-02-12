"use client"

import { AlertTriangle, Split } from "lucide-react"
import type { LeadTimeGroup } from "@/lib/fulfillment"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface MixedLeadtimeAlertProps {
  groups: LeadTimeGroup[]
  onSplit: () => void
}

export function MixedLeadtimeAlert({ groups, onSplit }: MixedLeadtimeAlertProps) {
  const quickGroup = groups.find((g) => g.label === "Ready sooner")
  const slowGroup = groups.find((g) => g.label === "Needs more preparation")

  if (!quickGroup || !slowGroup) return null

  return (
    <Alert className="border-primary/30 bg-primary/5">
      <AlertTriangle className="h-5 w-5 text-primary" />
      <AlertTitle className="text-base font-semibold">
        Your items have different preparation times
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Some items like{" "}
          <strong className="text-foreground">
            {quickGroup.items.map((i) => i.name).join(", ")}
          </strong>{" "}
          could be ready by{" "}
          <strong className="text-foreground">
            {quickGroup.earliestDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </strong>
          , but{" "}
          <strong className="text-foreground">
            {slowGroup.items.map((i) => i.name).join(", ")}
          </strong>{" "}
          needs {slowGroup.maxLeadTime} days to prepare (ready by{" "}
          <strong className="text-foreground">
            {slowGroup.earliestDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </strong>
          ).
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" className="gap-2" onClick={onSplit}>
            <Split className="h-4 w-4" />
            Split Into Separate Orders
          </Button>
          <p className="self-center text-xs text-muted-foreground">
            or keep everything in one order and wait for the later date
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
