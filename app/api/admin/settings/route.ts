import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withCacheInvalidation } from "@/lib/cache-invalidation";

async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.username) return null;
  return session;
}

function parseString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.siteSetting.findFirst({
    orderBy: { id: "asc" },
  });

  if (!settings) {
    return NextResponse.json({
      cutoff_time: "",
      delivery_fee: 0,
      min_order_delivery: 0,
      store_phone: "",
      store_email: "",
      dashboard_pending_status_id: null,
      dashboard_in_progress_status_id: null,
      dashboard_ready_status_id: null,
    });
  }

  return NextResponse.json({
    cutoff_time: settings.cutoffTime ?? "",
    delivery_fee: Number(settings.deliveryFee),
    min_order_delivery: Number(settings.minOrderDelivery),
    store_phone: settings.storePhone,
    store_email: settings.storeEmail,
    dashboard_pending_status_id: settings.dashboardPendingStatusId ?? null,
    dashboard_in_progress_status_id:
      settings.dashboardInProgressStatusId ?? null,
    dashboard_ready_status_id: settings.dashboardReadyStatusId ?? null,
    contact_receiver_emails: settings.contactReceiverEmails ?? "",
    contact_sender_email: settings.contactSenderEmail ?? "",
    max_contact_submissions_per_day: settings.maxContactSubmissionsPerDay ?? 5,
  });
}

async function PUTHandler(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const cutoffTime = parseString(body.cutoff_time);
  const storePhone = parseString(body.store_phone);
  const storeEmail = parseString(body.store_email);
  const deliveryFee = Number(body.delivery_fee ?? 0);
  const minOrderDelivery = Number(body.min_order_delivery ?? 0);
  const dashboardPendingStatusId = body.dashboard_pending_status_id ?? null;
  const dashboardInProgressStatusId =
    body.dashboard_in_progress_status_id ?? null;
  const dashboardReadyStatusId = body.dashboard_ready_status_id ?? null;
  const contactReceiverEmails = parseString(body.contact_receiver_emails);
  const contactSenderEmail = parseString(body.contact_sender_email);
  const maxContactSubmissionsPerDay = Number(
    body.max_contact_submissions_per_day ?? 5,
  );

  if (!storePhone || !storeEmail) {
    return NextResponse.json(
      { error: "store_phone and store_email are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.siteSetting.findFirst({
    orderBy: { id: "asc" },
  });
  const settings = existing
    ? await prisma.siteSetting.update({
        where: { id: existing.id },
        data: {
          cutoffTime,
          deliveryFee,
          minOrderDelivery,
          storePhone,
          storeEmail,
          dashboardPendingStatusId,
          dashboardInProgressStatusId,
          dashboardReadyStatusId,
          contactReceiverEmails,
          contactSenderEmail,
          maxContactSubmissionsPerDay,
          updatedBy: actor,
        },
      })
    : await prisma.siteSetting.create({
        data: {
          cutoffTime,
          deliveryFee,
          minOrderDelivery,
          storePhone,
          storeEmail,
          dashboardPendingStatusId,
          dashboardInProgressStatusId,
          dashboardReadyStatusId,
          contactReceiverEmails,
          contactSenderEmail,
          maxContactSubmissionsPerDay,
          createdBy: actor,
        },
      });

  return NextResponse.json({
    cutoff_time: settings.cutoffTime ?? "",
    delivery_fee: Number(settings.deliveryFee),
    min_order_delivery: Number(settings.minOrderDelivery),
    dashboard_pending_status_id: settings.dashboardPendingStatusId,
    dashboard_in_progress_status_id: settings.dashboardInProgressStatusId,
    dashboard_ready_status_id: settings.dashboardReadyStatusId,
    contact_receiver_emails: settings.contactReceiverEmails,
    contact_sender_email: settings.contactSenderEmail,
    max_contact_submissions_per_day: settings.maxContactSubmissionsPerDay,
  });
}

// Wrapped centrally so every mutation purges the storefront caches.
export const PUT = withCacheInvalidation(PUTHandler);
