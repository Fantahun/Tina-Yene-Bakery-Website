import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Order, OrderItem, PickupLocation } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// A transport per send opens a fresh TLS connection (and its sockets/threads)
// for every email, which inflates the process count on shared hosting. Cache a
// single pooled transport on globalThis so connections are reused and bounded.
const globalForMailer = globalThis as unknown as { mailer?: Transporter };

function getTransporter(): Transporter {
  if (globalForMailer.mailer) return globalForMailer.mailer;

  const port = Number(process.env.EMAIL_PORT) || 587;
  // Port 465 is implicit TLS: connecting without `secure` makes nodemailer
  // attempt a plaintext handshake that hangs until the socket times out,
  // holding the request open. Derive it from the port and allow an explicit
  // override for non-standard setups.
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 2,
    maxMessages: 100,
    // Fail fast instead of pinning a request thread to a dead SMTP host.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  globalForMailer.mailer = transporter;
  return transporter;
}

export async function sendEmail({
  to,
  from,
  subject,
  text,
  html,
}: {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const transporter = getTransporter();

  try {
    const info = await transporter.sendMail({
      from, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

export async function sendOrderConfirmationEmail(
  order: Order & { items: OrderItem[]; pickupLocation: PickupLocation | null },
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://yenebakery.com";

  // Format currency
  const formatCurrency = (amount: number | string | any) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(amount));
  };

  const settings = await prisma.siteSetting.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { storePhone: true },
  });
  const storePhone = settings?.storePhone || "510-500-1234";

  const fulfillmentMethodDisplay =
    order.fulfillmentMethod === "pickup" ? "Store Pickup" : "Delivery";

  // Some historical/legacy orders may miss sizeName on OrderItem.
  // Prefer persisted productSizeId (deterministic), then fallback to productId + unitPrice.
  const itemProductSizeIds = order.items
    .map((item) => (item as any).productSizeId)
    .filter((id): id is number => typeof id === "number");

  const explicitSizes =
    itemProductSizeIds.length > 0
      ? await prisma.productSize.findMany({
          where: { id: { in: itemProductSizeIds } },
          select: {
            id: true,
            name: true,
            serves: true,
            price: true,
          },
        })
      : [];

  const explicitSizeById = new Map(
    explicitSizes.map((size) => [
      size.id,
      { name: size.name, serves: size.serves, price: Number(size.price) },
    ]),
  );

  const itemProductIds = order.items
    .map((item) => item.productId)
    .filter((id): id is number => typeof id === "number");

  const productsWithSizes =
    itemProductIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: itemProductIds } },
          select: {
            id: true,
            sizes: {
              select: {
                name: true,
                serves: true,
                price: true,
              },
            },
          },
        })
      : [];

  const productSizesByProductId = new Map(
    productsWithSizes.map((product) => [
      product.id,
      product.sizes.map((size) => ({
        name: size.name,
        serves: size.serves,
        price: Number(size.price),
      })),
    ]),
  );

  const itemsHtml = order.items
    .map(
      (item) => {
        const explicitSize =
          typeof (item as any).productSizeId === "number"
            ? explicitSizeById.get((item as any).productSizeId) ?? null
            : null;

        const sizesForProduct =
          typeof item.productId === "number"
            ? productSizesByProductId.get(item.productId) ?? []
            : [];

        const matchedSize = sizesForProduct.find(
          (size) => Math.abs(size.price - Number(item.unitPrice)) < 0.01,
        );

        const resolvedSizeName =
          (item as any).sizeName ??
          (item as any).size_name ??
          (item as any).size ??
          explicitSize?.name ??
          matchedSize?.name ??
          null;
        const resolvedServes =
          (item as any).serves ??
          (item as any).servesText ??
          explicitSize?.serves ??
          matchedSize?.serves ??
          null;

        const sizeText =
          typeof resolvedSizeName === "string" && resolvedSizeName.trim().length > 0
            ? resolvedSizeName.trim()
            : "";
        const servesText =
          typeof resolvedServes === "string" && resolvedServes.trim().length > 0
            ? resolvedServes.trim()
            : "";

        return `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">
         <p style="margin: 0; font-weight: 600; color: #111827;">
          ${item.productName}${sizeText ? ` <span style="font-weight: 500; color: #374151;">(${sizeText})</span>` : ""}
         </p>
        ${servesText ? `<p style="margin: 3px 0 0; font-size: 11px; color: #6b7280;">Serves: ${servesText}</p>` : ""}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 13px;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px;">
        ${formatCurrency(item.unitPrice)}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 13px; font-weight: 500;">
        ${formatCurrency(item.lineTotal)}
      </td>
    </tr>
  `;
      },
    )
    .join("");

  const itemsText = order.items
    .map((item) => {
      const explicitSize =
        typeof (item as any).productSizeId === "number"
          ? explicitSizeById.get((item as any).productSizeId) ?? null
          : null;

      const sizesForProduct =
        typeof item.productId === "number"
          ? productSizesByProductId.get(item.productId) ?? []
          : [];

      const matchedSize = sizesForProduct.find(
        (size) => Math.abs(size.price - Number(item.unitPrice)) < 0.01,
      );

      const resolvedSizeName =
        (item as any).sizeName ??
        (item as any).size_name ??
        (item as any).size ??
        explicitSize?.name ??
        matchedSize?.name ??
        null;
      const resolvedServes =
        (item as any).serves ??
        (item as any).servesText ??
        explicitSize?.serves ??
        matchedSize?.serves ??
        null;

      const sizeText =
        typeof resolvedSizeName === "string" && resolvedSizeName.trim().length > 0
          ? ` (${resolvedSizeName.trim()})`
          : "";
      const servesText =
        typeof resolvedServes === "string" && resolvedServes.trim().length > 0
          ? ` - Serves ${resolvedServes.trim()}`
          : "";

      return `- ${item.quantity}x ${item.productName}${sizeText}${servesText}: ${formatCurrency(item.lineTotal)}`;
    })
    .join("\n");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { padding: 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; }
        .logo { height: 64px; width: auto; margin-bottom: 16px; }
        .content { padding: 32px; }
        .footer { padding: 32px; text-align: center; background-color: #f9fafb; font-size: 12px; color: #6b7280; }
        h1 { margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #111827; }
        h2 { margin: 24px 0 16px; font-size: 18px; font-weight: 600; color: #111827; }
        p { margin: 0 0 16px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .info-item { margin-bottom: 16px; }
        .label { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
        .value { color: #111827; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        .order-table th { text-align: left; padding: 10px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .order-table th.center { text-align: center; }
        .order-table th.right { text-align: right; }
        .totals { width: 100%; max-width: 250px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.final { border-top: 2px solid #e5e7eb; margin-top: 8px; padding-top: 16px; font-weight: 700; font-size: 18px; color: #111827; }
        .button { display: inline-block; background-color: #eab308; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <!-- Logo URL for email -->
           <img src="https://www.yenebakery.com/images/logo/yene-bakery.png" alt="Yene Bakery" class="logo" style="max-height: 80px;">
           <h1>Order Confirmed!</h1>
           <p>Thank you for your order, ${order.customerName}. We've received it and will start preparing it soon.</p>
           <p style="font-size: 14px; color: #6b7280;">Order NO: ${order.confirmationNumber}</p>
        </div>
        
        <div class="content">
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${baseUrl}/order-status/${order.confirmationNumber}" class="button">Track Your Order</a>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <span class="label">Date</span>
              <div class="value">${new Date(order.createdAt).toLocaleDateString()}</div>
            </div>
            
            <div class="info-item">
              <span class="label">Fulfillment Method</span>
              <div class="value">${fulfillmentMethodDisplay}</div>
            </div>

            <div class="info-item">
               <span class="label">${order.fulfillmentMethod === "pickup" ? "Pickup Location" : "Delivery Address"}</span>
               <div class="value">
                 ${order.fulfillmentMethod === "pickup" && order.pickupLocation ? order.pickupLocation.name + " - " + order.pickupLocation.address : ""}
                 ${order.fulfillmentMethod === "delivery" ? order.deliveryAddress : ""}
               </div>
            </div>

             <div class="info-item">
              <span class="label">Scheduled For</span>
              <div class="value">${new Date(order.fulfillmentDate).toLocaleString()}</div>
            </div>
          </div>

          <h2>Order Summary</h2>
          <table class="order-table">
            <thead>
              <tr>
                <th>Item</th>
                <th class="center">Qty</th>
                <th class="right">Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${
              Number(order.deliveryFee) > 0
                ? `
            <div class="total-row">
              <span>Delivery Fee</span>
              <span>${formatCurrency(order.deliveryFee)}</span>
            </div>
            `
                : ""
            }
            <div class="total-row final">
              <span>Total </span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px;">
             <p>If you have any questions, please contact us at <a href="tel:${storePhone.replace(/\D/g, "")}">${storePhone}</a> or reply to this email.</p>
          </div>
        </div>
        
        <div class="footer">
          &copy; ${new Date().getFullYear()} Yene Bakery. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: order.customerEmail,
    from: `"Yene Bakery" <${process.env.EMAIL_USER || "orders@yenebakery.com"}>`, // Needs to be verified sender
    subject: `Order Confirmation #${order.confirmationNumber} - Yene Bakery`,
    text:
      `Thank you for your order!\n\n` +
      `Order Number: ${order.confirmationNumber}\n` +
      `Items:\n${itemsText}\n\n` +
      `Subtotal: ${formatCurrency(order.subtotal)}\n` +
      `${Number(order.deliveryFee) > 0 ? `Delivery Fee: ${formatCurrency(order.deliveryFee)}\n` : ""}` +
      `Total: ${formatCurrency(order.total)}\n\n` +
      `Track your order: ${baseUrl}/order-status/${order.confirmationNumber}`,
    html: html,
  });
}
