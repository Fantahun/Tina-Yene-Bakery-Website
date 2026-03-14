"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle, // Add XCircle
  CalendarDays,
  MapPin,
  Truck,
  Store,
  Package,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getOrderFromSession } from "@/app/actions/stripe"; // Changed import
import { useAppDispatch } from "@/store/hooks";
import { clearCart } from "@/store/cart-slice";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface OrderData {
  confirmationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentMethod: "pickup" | "delivery";
  fulfillmentDate: string;
  pickupLocation?: { name: string; address: string } | null;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  orderNotes?: string;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [paymentFailed, setPaymentFailed] = useState(false); // Add this state

  useEffect(() => {
    const verifyAndLoadOrder = async () => {
      const sessionId = searchParams.get("session_id");

      if (!sessionId) {
          // If no session ID, we can't verify the order from DB.
          // Fallback to session storage is insecure/unreliable for "Order Confirmed" page 
          // that claims payment success.
          // Better to redirect to home or cart.
          router.push("/");
          return;
      }

      try {
        const dbOrder = await getOrderFromSession(sessionId);
        
        if (dbOrder.paymentStatus !== "paid") {
            console.warn("Order found but payment status is:", dbOrder.paymentStatus);
            setPaymentFailed(true);
            setLoading(false);
            return;
        }

        // Map DB order to OrderData interface for display
        const orderData: OrderData = {
            confirmationNumber: dbOrder.confirmationNumber,
            customerName: dbOrder.customerName,
            customerEmail: dbOrder.customerEmail,
            customerPhone: dbOrder.customerPhone,
            fulfillmentMethod: dbOrder.fulfillmentMethod === 'pickup' ? 'pickup' : 'delivery',
            fulfillmentDate: new Date(dbOrder.fulfillmentDate).toISOString(),
            pickupLocation: dbOrder.pickupLocation ? {
                name: dbOrder.pickupLocation.name,
                address: dbOrder.pickupLocation.address
            } : null,
            deliveryAddress: dbOrder.deliveryAddress || undefined,
            // We store full address in DB, splitting might be needed if UI demands it, 
            // but currently UI just displays address.
            // Let's just put full address in deliveryAddress
            deliveryCity: "", // Not stored separately in DB string
            deliveryState: "",
            deliveryZip: "",
            orderNotes: dbOrder.orderNotes || undefined,
            items: dbOrder.items.map((i: any) => ({
                name: i.productName,
                quantity: i.quantity,
                price: Number(i.unitPrice),
                lineTotal: Number(i.lineTotal)
            })),
            subtotal: Number(dbOrder.subtotal),
            deliveryFee: Number(dbOrder.deliveryFee),
            total: Number(dbOrder.total)
        };

        setOrder(orderData);
        
        // Clear client side data
        sessionStorage.removeItem("YeneBakery_checkout_data");
        dispatch(clearCart());
        
      } catch (error) {
        console.error("[YeneBakery] Error verifying payment:", error);
        // If we can't verify, don't show success
        router.push("/checkout"); 
      } finally {
        setLoading(false);
      }
    };

    void verifyAndLoadOrder();
  }, [router, searchParams, dispatch]);

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">
            Verifying your payment...
          </p>
        </div>
      </div>
    );
  }

  if (paymentFailed) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-foreground">Payment Failed</h1>
          <p className="mt-2 text-muted-foreground">
            We were unable to process your payment. Your order has not been finalized.
          </p>
          <div className="mt-6 flex gap-4">
            <Button asChild variant="outline">
              <Link href="/cart">Return to Cart</Link>
            </Button>
            <Button asChild>
              <Link href="/checkout/payment">Try Again</Link>
            </Button>
          </div>
        </div>
      );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">No order found</h1>
        <p className="mt-2 text-muted-foreground">
          It looks like you arrived here without placing an order.
        </p>
        <Button asChild className="mt-6">
          <Link href="/shop">Browse Our Menu</Link>
        </Button>
      </div>
    );
  }

  const fulfillmentDate = new Date(order.fulfillmentDate);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Success Header */}
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Order Confirmed!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Thank you, {order.customerName}. Your order has been placed.
        </p>
        <p className="mt-1 text-lg font-semibold text-primary">
          Confirmation: {order.confirmationNumber}
        </p>
      </div>

      {/* Order Details Card */}
      <div className="mt-10 rounded-lg border border-border bg-card p-6">
        {/* Fulfillment Info */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
          <div className="flex items-start gap-3">
            {order.fulfillmentMethod === "pickup" ? (
              <Store className="mt-0.5 h-5 w-5 text-primary" />
            ) : (
              <Truck className="mt-0.5 h-5 w-5 text-primary" />
            )}
            <div>
              <p className="text-sm font-medium text-card-foreground">
                {order.fulfillmentMethod === "pickup"
                  ? "Store Pickup"
                  : "Delivery"}
              </p>
              {order.fulfillmentMethod === "pickup" && order.pickupLocation && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {order.pickupLocation.name}
                  <br />
                  {order.pickupLocation.address}
                </p>
              )}
              {order.fulfillmentMethod === "delivery" && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {order.deliveryAddress}
                  <br />
                  {order.deliveryCity}, {order.deliveryState}{" "}
                  {order.deliveryZip}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Fulfillment Date
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {fulfillmentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {order.orderNotes && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-sm font-medium text-card-foreground">
                Order Notes
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.orderNotes}
              </p>
            </div>
          </>
        )}

        <Separator className="my-4" />

        {/* Items */}
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            <Package className="h-4 w-4" />
            Order Items
          </h3>
          <div className="mt-3 space-y-2">
            {order.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {item.quantity}x {item.name}
                </span>
                <span className="font-medium">
                  ${item.lineTotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          {order.deliveryFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>${order.deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Confirmation Email Notice */}
      <div className="mt-6 rounded-lg bg-muted p-4 text-center">
        <div className="flex items-center justify-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to{" "}
            <strong className="text-foreground">{order.customerEmail}</strong>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button asChild variant="outline" className="gap-2">
          <Link href="/shop">
            Continue Shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild className="gap-2">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
