"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Store,
  Truck,
  CalendarDays,
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  StickyNote,
  Loader2,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  selectCartItems,
  selectCartSubtotal,
  selectMaxLeadTime,
  clearCart,
} from "@/store/cart-slice";
import { pickupLocations, siteSettings } from "@/lib/mock-data";
import { getEarliestFulfillmentDate, isDateDisabled } from "@/lib/fulfillment";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CheckoutForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const subtotal = useAppSelector(selectCartSubtotal);
  const maxLeadTime = useAppSelector(selectMaxLeadTime);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allPickupAllowed = items.every((i) => i.pickup_allowed);
  const allDeliveryAllowed = items.every((i) => i.delivery_allowed);

  const earliestDate = useMemo(
    () => getEarliestFulfillmentDate(maxLeadTime),
    [maxLeadTime],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      businessName: "",
      fulfillmentMethod: allPickupAllowed ? "pickup" : "delivery",
      pickupLocationId: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      orderNotes: "",
    },
  });

  const fulfillmentMethod = watch("fulfillmentMethod");
  const selectedDate = watch("fulfillmentDate");
  const deliveryFee =
    fulfillmentMethod === "delivery" ? siteSettings.delivery_fee : 0;
  const total = subtotal + deliveryFee;

  const onSubmit = async (data: CheckoutFormValues) => {
    setIsSubmitting(true);
    try {
      // Store order data temporarily for the success page
      const pickupLocation = data.pickupLocationId
        ? pickupLocations.find((l) => l.id.toString() === data.pickupLocationId)
        : null;

      const orderData = {
        ...data,
        fulfillmentDate: data.fulfillmentDate.toISOString(),
        pickupLocation,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          lineTotal: i.price * i.quantity,
        })),
        subtotal,
        deliveryFee,
        total,
      };
      sessionStorage.setItem(
        "YeneBakery_checkout_data",
        JSON.stringify(orderData),
      );

      // Redirect to embedded checkout page
      router.push("/checkout/payment");
    } catch (error) {
      console.error("[YeneBakery] Checkout submission error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Customer Information */}
      <section>
        <h2 className="text-xl font-semibold text-foreground">
          Contact Information
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {"We'll use this to send your order confirmation."}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customerName" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Full Name
            </Label>
            <Input
              id="customerName"
              placeholder="Jane Doe"
              {...register("customerName")}
              aria-invalid={!!errors.customerName}
            />
            {errors.customerName && (
              <p className="text-sm text-destructive">
                {errors.customerName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="customerEmail"
              className="flex items-center gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="jane@example.com"
              {...register("customerEmail")}
              aria-invalid={!!errors.customerEmail}
            />
            {errors.customerEmail && (
              <p className="text-sm text-destructive">
                {errors.customerEmail.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="customerPhone"
              className="flex items-center gap-1.5"
            >
              <Phone className="h-3.5 w-3.5" />
              Phone Number
            </Label>
            <Input
              id="customerPhone"
              type="tel"
              placeholder="(555) 123-4567"
              {...register("customerPhone")}
              aria-invalid={!!errors.customerPhone}
            />
            {errors.customerPhone && (
              <p className="text-sm text-destructive">
                {errors.customerPhone.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="businessName" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Business Name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="businessName"
              placeholder="Your Company"
              {...register("businessName")}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Fulfillment Method */}
      <section>
        <h2 className="text-xl font-semibold text-foreground">
          Fulfillment Method
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you would like to receive your order.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {allPickupAllowed && (
            <button
              type="button"
              onClick={() => setValue("fulfillmentMethod", "pickup")}
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                fulfillmentMethod === "pickup"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <Store
                className={cn(
                  "h-6 w-6",
                  fulfillmentMethod === "pickup"
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <div>
                <p className="font-medium text-card-foreground">Store Pickup</p>
                <p className="text-sm text-muted-foreground">Free pickup</p>
              </div>
            </button>
          )}
          {allDeliveryAllowed && (
            <button
              type="button"
              onClick={() => setValue("fulfillmentMethod", "delivery")}
              className={cn(
                "flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                fulfillmentMethod === "delivery"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <Truck
                className={cn(
                  "h-6 w-6",
                  fulfillmentMethod === "delivery"
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              />
              <div>
                <p className="font-medium text-card-foreground">Delivery</p>
                <p className="text-sm text-muted-foreground">
                  ${siteSettings.delivery_fee.toFixed(2)} delivery fee
                </p>
              </div>
            </button>
          )}
        </div>

        {/* Pickup Location */}
        {fulfillmentMethod === "pickup" && (
          <div className="mt-4 space-y-2">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Pickup Location
            </Label>
            <Select
              value={watch("pickupLocationId") || ""}
              onValueChange={(val) => setValue("pickupLocationId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {pickupLocations
                  .filter((l) => l.is_active)
                  .map((location) => (
                    <SelectItem
                      key={location.id}
                      value={location.id.toString()}
                    >
                      {location.name} - {location.address}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.pickupLocationId && (
              <p className="text-sm text-destructive">
                {errors.pickupLocationId.message}
              </p>
            )}
          </div>
        )}

        {/* Delivery Address */}
        {fulfillmentMethod === "delivery" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="deliveryAddress">Street Address</Label>
              <Input
                id="deliveryAddress"
                placeholder="123 Main Street, Apt 4B"
                {...register("deliveryAddress")}
                aria-invalid={!!errors.deliveryAddress}
              />
              {errors.deliveryAddress && (
                <p className="text-sm text-destructive">
                  {errors.deliveryAddress.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryCity">City</Label>
              <Input
                id="deliveryCity"
                placeholder="City"
                {...register("deliveryCity")}
                aria-invalid={!!errors.deliveryCity}
              />
              {errors.deliveryCity && (
                <p className="text-sm text-destructive">
                  {errors.deliveryCity.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryState">State</Label>
                <Input
                  id="deliveryState"
                  placeholder="CA"
                  {...register("deliveryState")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryZip">ZIP Code</Label>
                <Input
                  id="deliveryZip"
                  placeholder="90210"
                  {...register("deliveryZip")}
                  aria-invalid={!!errors.deliveryZip}
                />
                {errors.deliveryZip && (
                  <p className="text-sm text-destructive">
                    {errors.deliveryZip.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <Separator />

      {/* Fulfillment Date */}
      <section>
        <h2 className="text-xl font-semibold text-foreground">
          Fulfillment Date
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select when you would like your order.{" "}
          {maxLeadTime > 0 && (
            <span>
              Some items require {maxLeadTime} day
              {maxLeadTime > 1 ? "s" : ""} of preparation.
            </span>
          )}
        </p>
        <div className="mt-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start gap-2 text-left font-normal sm:w-[300px]",
                  !selectedDate && "text-muted-foreground",
                )}
              >
                <CalendarDays className="h-4 w-4" />
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) setValue("fulfillmentDate", date);
                }}
                disabled={(date) => isDateDisabled(date, earliestDate)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.fulfillmentDate && (
            <p className="mt-2 text-sm text-destructive">
              {errors.fulfillmentDate.message}
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* Order Notes */}
      <section>
        <h2 className="text-xl font-semibold text-foreground">Order Notes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Any special instructions or requests for your order.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="orderNotes" className="flex items-center gap-1.5">
            <StickyNote className="h-3.5 w-3.5" />
            Notes <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="orderNotes"
            placeholder="E.g., Write 'Happy Birthday Sarah' on the cake..."
            rows={3}
            {...register("orderNotes")}
          />
        </div>
      </section>

      <Separator />

      {/* Order Total Summary */}
      <section className="rounded-lg bg-muted p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})
            </span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {fulfillmentMethod === "delivery" && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between text-base font-bold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </section>

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Place Order - ${total.toFixed(2)}</>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        {
          "By placing this order, you agree to YeneBakery's terms and conditions. Payment will be processed securely via Stripe."
        }
      </p>
    </form>
  );
}
