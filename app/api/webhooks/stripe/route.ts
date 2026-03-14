import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@prisma/client";
import { sendOrderConfirmationEmail } from "@/lib/email";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook signature verification failed: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve the order ID from client_reference_id
    // We set this in app/actions/stripe.ts
    const orderId = session.client_reference_id;

    if (!orderId) {
        console.error("No client_reference_id found in session");
        // Might be a session not created by our new flow?
        return new NextResponse("No order ID", { status: 200 });
    }

    try {
      // 1. Update Order Status to Paid status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.paid,
          stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        } as any,
        include: {
            items: true,
            pickupLocation: true
        }
      });
      console.log(`Order ${orderId} marked as PAID.`);

      // 2. Send Confirmation Email
      if (updatedOrder.customerEmail) {
          await sendOrderConfirmationEmail(updatedOrder as any);
          console.log(`Confirmation email sent to ${updatedOrder.customerEmail}`);
      }

    } catch (err) {
      console.error(`Error processing successful checkout for order ${orderId}:`, err);
      // Return 500 so Stripe retries
      return new NextResponse("Internal Server Error", { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
