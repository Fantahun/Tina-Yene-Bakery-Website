"use client"

import { useState } from "react"
import { Calendar, MapPin, Truck, Phone, Mail, Package, Building2, MessageSquare, Send } from "lucide-react"
import { type Order, type OrderStatus } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  in_preparation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ready_for_pickup: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

interface OrderDetailsDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
}: OrderDetailsDialogProps) {
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(order.order_status)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setIsUpdating(true)
    try {
      // In production, this would call an API to update the order status
      await new Promise((resolve) => setTimeout(resolve, 500))
      setOrderStatus(newStatus)
      toast.success(`Order status updated to ${newStatus.replace("_", " ")}`)
      
      // Automatically send SMS when marked as ready_for_pickup
      if (newStatus === "ready_for_pickup") {
        await handleSendSMS()
      }
    } catch (error) {
      toast.error("Failed to update order status")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendSMS = async () => {
    try {
      // In production, this would call an API to send SMS via Twilio/similar
      await new Promise((resolve) => setTimeout(resolve, 500))
      toast.success(`SMS sent to ${order.customer_phone}`)
    } catch (error) {
      toast.error("Failed to send SMS")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {order.confirmation_number}
              </DialogTitle>
              <DialogDescription>Order details and management</DialogDescription>
            </div>
            <Badge className={statusColors[orderStatus]} variant="secondary">
              {orderStatus.replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Update */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Update Order Status
            </label>
            <div className="flex gap-2">
              <Select
                value={orderStatus}
                onValueChange={(value) => handleStatusUpdate(value as OrderStatus)}
                disabled={isUpdating}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_preparation">In Preparation</SelectItem>
                  <SelectItem value="ready_for_pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {orderStatus === "ready_for_pickup" && (
                <Button
                  onClick={handleSendSMS}
                  variant="outline"
                  size="icon"
                  title="Send SMS notification"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {orderStatus === "ready_for_pickup" &&
                "SMS will be sent automatically when marked as ready for pickup"}
            </p>
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Customer Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{order.customer_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{order.customer_email}</span>
              </div>
              {order.business_name && (
                <div className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Business:</span>
                  <span className="font-medium">{order.business_name}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Fulfillment Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Fulfillment Details</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">
                    {new Date(order.fulfillment_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                {order.fulfillment_method === "pickup" ? (
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                ) : (
                  <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <span className="text-muted-foreground">
                    {order.fulfillment_method === "pickup"
                      ? "Pickup Location:"
                      : "Delivery Address:"}
                  </span>
                  <p className="font-medium">
                    {order.fulfillment_method === "pickup"
                      ? order.pickup_location
                      : order.delivery_address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {order.order_notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Order Notes
                </h3>
                <p className="rounded-md bg-muted p-3 text-sm text-foreground">
                  {order.order_notes}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Order Items */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Package className="h-4 w-4" />
              Order Items
            </h3>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-muted p-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qty: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">
                    ${item.line_total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Order Total */}
          <div className="space-y-2 rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span>${order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {order.payment_status}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
