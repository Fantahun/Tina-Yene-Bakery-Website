"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  createCheckoutSession,
  type CheckoutSessionData,
} from "@/app/actions/stripe";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

function PaymentContent() {
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initCheckout = async () => {
      try {
        console.log("[YeneBakery] Starting checkout initialization");
        const storedData = sessionStorage.getItem("YeneBakery_checkout_data");

        if (!storedData) {
          console.log(
            "[YeneBakery] No checkout data found, redirecting to checkout",
          );
          router.push("/checkout");
          return;
        }

        console.log("[YeneBakery] Checkout data found, parsing...");
        const data = JSON.parse(storedData) as CheckoutSessionData & {
          pickupLocation?: { id: number; name: string; address: string };
        };

        const sessionData: CheckoutSessionData = {
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          businessName: data.businessName,
          fulfillmentMethod: data.fulfillmentMethod,
          fulfillmentDate: data.fulfillmentDate,
          pickupLocationId: data.pickupLocationId,
          pickupLocationName: data.pickupLocation?.name,
          pickupLocationAddress: data.pickupLocation?.address,
          deliveryAddress: data.deliveryAddress,
          deliveryCity: data.deliveryCity,
          deliveryState: data.deliveryState,
          deliveryZip: data.deliveryZip,
          orderNotes: data.orderNotes,
          items: data.items,
          subtotal: data.subtotal,
          deliveryFee: data.deliveryFee,
          total: data.total,
        };

        console.log(
          "[YeneBakery] Creating checkout session with total:",
          data.total,
        );
        const result = await createCheckoutSession(sessionData);
        console.log(
          "[YeneBakery] Checkout session result:",
          result ? "success" : "failed",
        );

        if (result?.clientSecret) {
          console.log("[YeneBakery] Client secret received, setting state");
          setClientSecret(result.clientSecret);
        } else {
          throw new Error("No client secret returned from Stripe");
        }
      } catch (err) {
        console.error("[YeneBakery] Error initializing checkout:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        console.error("[YeneBakery] Error message:", errorMessage);
        setError(`Failed to initialize payment: ${errorMessage}`);
      }
    };

    initCheckout();
  }, [router]);

  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8">
          <h2 className="text-2xl font-bold text-destructive">
            Payment Initialization Failed
          </h2>
          <p className="mt-2 text-muted-foreground">
            Please try again later or contact support.
          </p>
          <button
            onClick={() => router.push("/checkout")}
            className="mt-6 rounded-md bg-primary px-6 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Return to Checkout
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">
            Initializing secure payment...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">
          Complete Your Payment
        </h1>
        <p className="mt-2 text-muted-foreground">
          Securely process your order with <b>Stripe</b>
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Your payment is securely processed by Stripe. We do not store any
          payment information on our servers.
        </p>
      </div>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ clientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
