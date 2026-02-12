"use client"

import { Package, CalendarDays } from "lucide-react"
import type { LeadTimeGroup } from "@/lib/fulfillment"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SplitOrderDialogProps {
  open: boolean
  onClose: () => void
  groups: LeadTimeGroup[]
  onConfirmSplit: () => void
}

export function SplitOrderDialog({
  open,
  onClose,
  groups,
  onConfirmSplit,
}: SplitOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split Your Order</DialogTitle>
          <DialogDescription>
            {`We'll separate your items into two orders so you can get some items sooner.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {groups.map((group, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-border p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-card-foreground">
                  Order {idx + 1}: {group.label}
                </span>
              </div>
              <ul className="mb-3 space-y-1">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{item.name}</span>
                    {item.prep_lead_time_days > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {item.prep_lead_time_days}d prep
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Ready by{" "}
                {group.earliestDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose}>
            Keep as One Order
          </Button>
          <Button onClick={onConfirmSplit}>
            Confirm Split
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
