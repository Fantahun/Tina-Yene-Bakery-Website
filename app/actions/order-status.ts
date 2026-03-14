"use server";

import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

// Simple in-memory rate limiter
// Map<IP, { count: number, resetAt: number }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

function cleanUpRateLimitMap() {
  const now = Date.now();
  for (const [ip, data] of rateLimitMap.entries()) {
    if (now > data.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

export async function getOrderStatus(confirmationNumber: string) {
  try {
    // Basic Rate Limiting check
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";

    // Clean up old entries occasionally (simple approach)
    if (Math.random() < 0.1) {
      cleanUpRateLimitMap();
    }

    const now = Date.now();
    const limitData = rateLimitMap.get(ip);

    if (limitData) {
      if (now > limitData.resetAt) {
        // Reset window
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      } else {
        if (limitData.count >= MAX_REQUESTS_PER_WINDOW) {
          const retryAfter = Math.ceil((limitData.resetAt - now) / 1000);
          throw new RateLimitError(
            `Too many requests. Please try again in ${retryAfter} seconds.`
          );
        }
        limitData.count++;
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    }

    if (!confirmationNumber) {
      throw new Error("Confirmation number is required");
    }

    const order = await prisma.order.findUnique({
      where: { confirmationNumber },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        pickupLocation: true,
        orderStatus: true,
      },
    });

    if (!order) {
      return null;
    }

    // Convert Decimals to numbers for client component
    return JSON.parse(JSON.stringify(order));
  } catch (error: any) {
    if (error.name === "RateLimitError") {
      throw error;
    }
    console.error("Error retrieving order:", error);
    throw new Error("Failed to retrieve order status");
  }
}
