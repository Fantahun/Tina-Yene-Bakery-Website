"use server"

import { stripe } from "@/lib/stripe"
import Stripe from "stripe"

export interface CheckoutSessionData {
  customerName: string
  customerEmail: string
  customerPhone: string
  businessName?: string
  fulfillmentMethod: "pickup" | "delivery"
  fulfillmentDate: string
  pickupLocationId?: string
  pickupLocationName?: string
  pickupLocationAddress?: string
  deliveryAddress?: string
  deliveryCity?: string
  deliveryState?: string
  deliveryZip?: string
  orderNotes?: string
  items: Array<{
    id: number
    name: string
    quantity: number
    price: number
  }>
  subtotal: number
  deliveryFee: number
  total: number
}

export async function createCheckoutSession(data: CheckoutSessionData) {
  try {
    console.log("[v0] Creating checkout session for:", data.customerEmail)
    console.log("[v0] Total amount:", data.total)
    console.log("[v0] Items count:", data.items.length)

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = data.items.map(
      (item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })
    )

    // Add delivery fee if applicable
    if (data.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Delivery Fee",
          },
          unit_amount: Math.round(data.deliveryFee * 100),
        },
        quantity: 1,
      })
    }

    // Store fulfillment details in metadata (Stripe has a 500 char limit per key, 50 keys max)
    const metadata: Record<string, string> = {
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      fulfillment_method: data.fulfillmentMethod,
      fulfillment_date: data.fulfillmentDate,
    }

    if (data.businessName) {
      metadata.business_name = data.businessName
    }

    if (data.fulfillmentMethod === "pickup" && data.pickupLocationName) {
      metadata.pickup_location_id = data.pickupLocationId || ""
      metadata.pickup_location_name = data.pickupLocationName
      metadata.pickup_location_address = data.pickupLocationAddress || ""
    }

    if (data.fulfillmentMethod === "delivery") {
      metadata.delivery_address = `${data.deliveryAddress}, ${data.deliveryCity}, ${data.deliveryState} ${data.deliveryZip}`
    }

    if (data.orderNotes) {
      // Truncate order notes if too long
      metadata.order_notes = data.orderNotes.substring(0, 450)
    }

    console.log("[v0] Creating Stripe session with", lineItems.length, "line items")
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: lineItems,
      mode: "payment",
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: data.customerEmail,
      metadata,
    })

    console.log("[v0] Stripe session created successfully:", session.id)
    return { clientSecret: session.client_secret }
  } catch (error) {
    console.error("[v0] Error creating Stripe checkout session:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      throw new Error(`Stripe error: ${error.message}`)
    }
    throw new Error("Failed to create checkout session")
  }
}

export async function getCheckoutSession(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    // Return only the serializable fields we actually need on the client.
    // Next.js cannot serialize class instances or objects with methods.
    return {
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
    }
  } catch (error) {
    console.error("Error retrieving checkout session:", error)
    throw new Error("Failed to retrieve checkout session")
  }
}
