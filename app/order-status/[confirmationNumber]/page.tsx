import { getOrderStatus } from "@/app/actions/order-status";
import {
  CalendarDays,
  Truck,
  Store,
  Package,
  Activity,
  DollarSign,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getOrderItemLineParts } from "@/lib/order-item-line";

const statusColors: Record<string, string> = {
  pending: "bg-orange-100 text-orange-800",
  in_preparation: "bg-blue-100 text-blue-800",
  ready_for_pickup: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-purple-100 text-purple-800",
};

function normalizeStatus(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

function getStatusClass(name: string) {
  return statusColors[normalizeStatus(name)] ?? "bg-muted text-foreground";
}

function getPaymentStatusClass(status: string) {
  return (
    paymentStatusColors[status.toLowerCase()] ?? "bg-gray-100 text-gray-800"
  );
}

export default async function OrderStatusResultPage({
  params,
}: {
  params: Promise<{ confirmationNumber: string }>;
}) {
  const { confirmationNumber } = await params;

  // Use try/catch because if prisma schema changed but client not updated,
  // or if DB connection fails, we want to handle it gracefully.
  let order;
  try {
    order = await getOrderStatus(confirmationNumber);
  } catch (e: any) {
    if (e.name === "RateLimitError") {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
          <div className="rounded-full bg-red-100 p-4 mb-4">
            <Info className="h-10 w-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Traffic Limit Exceeded
          </h1>
          <p className="mt-2 text-muted-foreground">{e.message}</p>
          <Button asChild className="mt-6">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      );
    }
    console.error("Failed to fetch order", e);
    // In a real app we might show a specific error page
    throw e;
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="rounded-full bg-muted p-4">
          <Info className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Order Not Found
        </h1>
        <p className="mt-2 text-muted-foreground">
          We couldn't find an order with number{" "}
          <span className="font-mono font-bold text-foreground">
            {confirmationNumber}
          </span>
          .
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please check the number and try again.
        </p>
        <Button asChild className="mt-6">
          <Link href="/order-status">Try Another Number</Link>
        </Button>
      </div>
    );
  }

  const fulfillmentDate = new Date(order.fulfillmentDate);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Order Status
        </h1>
        <div className="mt-2 text-lg font-semibold text-primary">
          #{order.confirmationNumber}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Badge
            className={`flex items-center gap-1.5 px-3 py-1 ${getStatusClass(order.orderStatus.name)}`}
            variant="secondary"
          >
            <Activity className="h-3.5 w-3.5" />
            {order.orderStatus.name}
          </Badge>
          <Badge
            className={`flex items-center gap-1.5 px-3 py-1 ${getPaymentStatusClass(order.paymentStatus)}`}
            variant="secondary"
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span className="capitalize">{order.paymentStatus}</span>
          </Badge>
        </div>
      </div>

      {/* Order Details Card */}
      <div className="mt-10 rounded-lg border border-border bg-card p-6 shadow-sm">
        {/* Customer Info */}
        <div className="mb-6 flex flex-col gap-1">
          <h3 className="text-sm font-medium text-muted-foreground">
            Customer
          </h3>
          <p className="text-base font-medium">{order.customerName}</p>
          <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
        </div>

        <Separator className="my-4" />

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
            {order.items.map((item: any, idx: number) => {
              const parts = getOrderItemLineParts({
                quantity: item.quantity,
                productName: item.productName,
                sizeName: item.sizeName,
                serves: item.serves,
              });

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-muted-foreground">
                      {parts.quantityText}
                    </span>
                    <div>
                      <p className="font-medium text-foreground">
                        {parts.productText}
                      </p>
                      {(parts.sizeText || parts.servesText) && (
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {parts.sizeText ? (
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              Size: {parts.sizeText}
                            </span>
                          ) : null}
                          {parts.servesText ? (
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              Serves: {parts.servesText}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="font-medium">
                    ${Number(item.lineTotal).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          {Number(order.deliveryFee) > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>${Number(order.deliveryFee).toFixed(2)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>${Number(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="text-center mt-6">
        <Button variant="link" asChild>
          <Link href="/order-status">Check Another Order</Link>
        </Button>
      </div>
    </div>
  );
}
