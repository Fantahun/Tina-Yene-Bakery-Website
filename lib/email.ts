import nodemailer from 'nodemailer';
import { Order, OrderItem, PickupLocation } from '@prisma/client';
import { prisma } from "@/lib/prisma";

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
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

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
  order: Order & { items: OrderItem[]; pickupLocation: PickupLocation | null }
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://yenebakery.com";
  
  // Format currency
  const formatCurrency = (amount: number | string | any) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount));
  };

  const settings = await prisma.siteSetting.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { storePhone: true },
  });
  const storePhone = settings?.storePhone || "510-500-1234";

  const fulfillmentMethodDisplay = 
    order.fulfillmentMethod === 'pickup' ? 'Store Pickup' : 'Delivery';

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0; font-weight: 500; color: #111827;">${item.productName}</p>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        ${formatCurrency(item.unitPrice)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">
        ${formatCurrency(item.lineTotal)}
      </td>
    </tr>
  `).join('');

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
        th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
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
               <span class="label">${order.fulfillmentMethod === 'pickup' ? 'Pickup Location' : 'Delivery Address'}</span>
               <div class="value">
                 ${order.fulfillmentMethod === 'pickup' && order.pickupLocation ? order.pickupLocation.name + ' - ' + order.pickupLocation.address : ''}
                 ${order.fulfillmentMethod === 'delivery' ? order.deliveryAddress : ''}
               </div>
            </div>

             <div class="info-item">
              <span class="label">Scheduled For</span>
              <div class="value">${new Date(order.fulfillmentDate).toLocaleString()}</div>
            </div>
          </div>

          <h2>Order Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
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
            ${Number(order.deliveryFee) > 0 ? `
            <div class="total-row">
              <span>Delivery Fee</span>
              <span>${formatCurrency(order.deliveryFee)}</span>
            </div>
            ` : ''}
            <div class="total-row final">
              <span>Total</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 40px;">
             <p>If you have any questions, please contact us at <a href="tel:${storePhone.replace(/\D/g, '')}">${storePhone}</a> or reply to this email.</p>
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
    from: `"Yene Bakery" <${process.env.EMAIL_USER || 'orders@yenebakery.com'}>`, // Needs to be verified sender
    subject: `Order Confirmation #${order.confirmationNumber} - Yene Bakery`,
    text: `Thank you for your order! Your confirmation number is ${order.confirmationNumber}. Total: ${formatCurrency(order.total)}.`,
    html: html,
  });
}
