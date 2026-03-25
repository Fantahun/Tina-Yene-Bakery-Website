"use server";

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { FulfillmentMethod, PaymentStatus, Prisma } from "@prisma/client";

export interface CheckoutSessionData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessName?: string;
  fulfillmentMethod: "pickup" | "delivery";
  fulfillmentDate: string;
  pickupLocationId?: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliveryState?: string;
  deliveryZip?: string;
  orderNotes?: string;
  items: Array<{
    id: number;
    cart_key?: string;
    slug?: string;
    size_id?: number;
    size_name?: string;
    serves?: string;
    // We only need ID and quantity from client,
    // other fields like price are ignored for security
    quantity: number;
    name?: string; // Optional for client-side optimistic UI, but server fetches real name
    price?: number; // Ignored
  }>;
  // These are ignored on server for calculation, but kept in interface for compatibility
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
}

export async function createCheckoutSession(data: CheckoutSessionData) {
  try {
    console.log(
      "[YeneBakery] Creating checkout session for:",
      data.customerEmail,
    );

    // 1. Fetch valid products from DB
    const productIds = data.items.map((item) => item.id);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        deletedAt: null,
      },
      include: {
        sizes: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    // 2. Calculate line items and totals
    let calculatedSubtotal = 0;
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

    for (const item of data.items) {
      const dbProduct = dbProducts.find((p) => p.id === item.id);

      if (!dbProduct) {
        console.warn(`Product ID ${item.id} not found or inactive.`);
        continue;
      }

      const selectedSize =
        dbProduct.hasSizes && item.size_id
          ? dbProduct.sizes.find((size) => size.id === item.size_id)
          : null;
      const fallbackSize = dbProduct.hasSizes ? dbProduct.sizes[0] : null;
      const resolvedSize = selectedSize ?? fallbackSize ?? null;

      if (dbProduct.hasSizes && !resolvedSize) {
        console.warn(
          `Product ID ${item.id} requires a size, but none is available.`,
        );
        continue;
      }

      const unitPrice = resolvedSize
        ? Number(resolvedSize.price)
        : Number(dbProduct.price);
      const quantity = item.quantity;
      const lineTotal = unitPrice * quantity;
      const displayName = resolvedSize
        ? `${dbProduct.name} - ${resolvedSize.name}`
        : dbProduct.name;

      calculatedSubtotal += lineTotal;

      // Handle product images explicitly for Stripe
      const productImages: string[] = [];
      if (dbProduct.imageUrl) {
        if (dbProduct.imageUrl.startsWith("http")) {
          productImages.push(dbProduct.imageUrl);
        } else {
          // It's a relative path.
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
          // Stripe requires absolute URLs.
          // Also, Stripe often rejects "localhost" as it cannot reach it to download the image.
          // We only include the image if we have a valid public base URL.
          if (
            baseUrl &&
            !baseUrl.includes("localhost") &&
            !baseUrl.includes("127.0.0.1")
          ) {
            try {
              // Construct absolute URL safely
              // Remove leading slash from path if base has trailing, or vice versa
              const cleanBase = baseUrl.endsWith("/")
                ? baseUrl.slice(0, -1)
                : baseUrl;
              const cleanPath = dbProduct.imageUrl.startsWith("/")
                ? dbProduct.imageUrl
                : `/${dbProduct.imageUrl}`;
              productImages.push(`${cleanBase}${cleanPath}`);
            } catch (e) {
              // ignore invalid url construction
              console.warn("Invalid image URL construction", e);
            }
          }
        }
      }

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: displayName,
            ...(resolvedSize?.serves
              ? { description: `Serves ${resolvedSize.serves}` }
              : {}),
            images: productImages,
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: quantity,
      });

      orderItemsData.push({
        productId: dbProduct.id,
        productName: dbProduct.name,
        sizeName: resolvedSize?.name,
        serves: resolvedSize?.serves,
        quantity: quantity,
        unitPrice: new Prisma.Decimal(unitPrice),
        lineTotal: new Prisma.Decimal(lineTotal),
      });
    }

    if (lineItems.length === 0) {
      throwError("No valid items in cart.");
    }

    // 3. Handle Delivery Fee
    let deliveryFee = 0;
    if (data.fulfillmentMethod === "delivery") {
      const settings = await prisma.siteSetting.findFirst({
        orderBy: { updatedAt: "desc" },
      });
      deliveryFee = Number(settings?.deliveryFee ?? 0);

      // Optional: Check minimum order amount for delivery
      if (
        settings?.minOrderDelivery &&
        calculatedSubtotal < Number(settings.minOrderDelivery)
      ) {
        // You might want to throw an error here or handle it gracefully
        console.warn("Order below minimum delivery amount");
      }
    }

    // Add delivery fee to Stripe line items
    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Delivery Fee",
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const calculatedTotal = calculatedSubtotal + deliveryFee;

    console.log("[YeneBakery] Calculated Total:", calculatedTotal);

    // 4. Create Pending Order in DB
    // Fetch default status
    const siteSettings = await prisma.siteSetting.findFirst({
      orderBy: { updatedAt: "desc" },
      include: { dashboardPendingStatus: true },
    });

    let defaultStatusId = siteSettings?.dashboardPendingStatusId;

    // Fallback if no setting
    if (!defaultStatusId) {
      const pendingStatus = await prisma.orderStatusEntry.findFirst({
        where: { name: "Pending" },
      });
      if (pendingStatus) defaultStatusId = pendingStatus.id;
    }

    // If still no status, fetch ANY status or create one (fallback safety)
    if (!defaultStatusId) {
      const anyStatus = await prisma.orderStatusEntry.findFirst();
      if (anyStatus) defaultStatusId = anyStatus.id;
      // If absolutely no statuses exist, this will fail. We assume DB is seeded.
    }

    if (!defaultStatusId) {
      throwError("Server Error: No order status configured.");
    }

    // Generate confirmation number: YB-ORD-[6_DIGIT_RANDOM]-[3_CHAR_RANDOM]-[YYMMDDHHMM]
    const now = new Date();
    // YYMMDDHHMM from UTC
    const timestamp = now.toISOString().replace(/[T:-]/g, "").slice(2, 12);
    const random6 = Math.floor(100000 + Math.random() * 900000).toString();
    const random3 = Math.random().toString(36).substring(2, 5).toUpperCase();

    const confirmationNumber = `YB-ORD-${random6}-${random3}-${timestamp}`;

    // Parse logic for fulfillment date (assuming string input)
    const fulfillmentDate = new Date(data.fulfillmentDate);

    const order = await prisma.order.create({
      data: {
        confirmationNumber: confirmationNumber,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        businessName: data.businessName,
        fulfillmentMethod:
          data.fulfillmentMethod === "pickup"
            ? FulfillmentMethod.pickup
            : FulfillmentMethod.delivery,
        fulfillmentDate: fulfillmentDate,
        pickupLocationId:
          data.fulfillmentMethod === "pickup" && data.pickupLocationId
            ? parseInt(data.pickupLocationId)
            : null,
        deliveryAddress:
          data.fulfillmentMethod === "delivery"
            ? `${data.deliveryAddress}, ${data.deliveryCity}, ${data.deliveryState} ${data.deliveryZip}`.trim()
            : null,
        subtotal: new Prisma.Decimal(calculatedSubtotal),
        deliveryFee: new Prisma.Decimal(deliveryFee),
        total: new Prisma.Decimal(calculatedTotal),
        orderNotes: data.orderNotes,
        orderStatusId: defaultStatusId,
        paymentStatus: PaymentStatus.pending, // Defaults to pending
        items: {
          create: orderItemsData,
        },
      },
    });

    // 5. Create Stripe Session with Order ID reference
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      client_reference_id: order.id, // Secure link
      line_items: lineItems,
      mode: "payment",
      customer_email: data.customerEmail,
      metadata: {
        orderId: order.id,
        confirmationNumber: order.confirmationNumber,
      },
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Update order with Stripe Session ID
    await prisma.order.update({
      where: { id: order.id },
      // @ts-ignore - Schema updated but client not generated
      data: { stripeSessionId: session.id } as any,
    });

    return { clientSecret: session.client_secret };
  } catch (err: any) {
    console.error("Error creating checkout session:", err);
    throw new Error(err.message || "Failed to create checkout session");
  }
}

export async function getOrderFromSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const orderId = session.client_reference_id;

    if (!orderId) {
      throwError("No order associated with this session");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        pickupLocation: true,
      },
    });

    if (!order) {
      throwError("Order not found");
    }

    // We update payment status here just in case webhook is slow,
    // but typically webhook handles it.
    // Optimization: If status is pending and session is paid, update it now.
    if (
      order.paymentStatus === PaymentStatus.pending &&
      session.payment_status === "paid"
    ) {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.paid },
      });
      order.paymentStatus = PaymentStatus.paid;
    }

    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error("Error retrieving order from session:", error);
    throw new Error("Failed to retrieve order details");
  }
}

function throwError(msg: string): never {
  throw new Error(msg);
}

/* 
// Unused function
export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // Return only the serializable fields we actually need on the client.
    // Next.js cannot serialize class instances or objects with methods.
    return {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    };
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    throw new Error("Failed to retrieve checkout session");
  }
} 
*/
