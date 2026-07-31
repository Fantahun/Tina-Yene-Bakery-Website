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

function parseBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const locations = await prisma.pickupLocation.findMany({
    where: { deletedAt: null },
    orderBy: { id: "asc" },
  });

  const mapped = locations.map((location) => ({
    id: location.id,
    name: location.name,
    address: location.address,
    is_active: location.isActive,
  }));

  return NextResponse.json(mapped);
}

async function POSTHandler(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const name = parseString(body.name);
  const address = parseString(body.address);
  const isActive = parseBoolean(body.is_active ?? body.isActive);

  if (!name || !address) {
    return NextResponse.json(
      { error: "name and address are required" },
      { status: 400 },
    );
  }

  const location = await prisma.pickupLocation.create({
    data: {
      name,
      address,
      isActive: isActive ?? true,
      createdBy: actor,
      updatedBy: actor,
    },
  });

  return NextResponse.json(
    {
      id: location.id,
      name: location.name,
      address: location.address,
      is_active: location.isActive,
    },
    { status: 201 },
  );
}

async function PUTHandler(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body || (!body.id && body.id !== 0)) {
    return NextResponse.json(
      { error: "Location id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Location id is invalid" },
      { status: 400 },
    );
  }

  const name = parseString(body.name);
  const address = parseString(body.address);
  const isActive = parseBoolean(body.is_active ?? body.isActive);

  const location = await prisma.pickupLocation.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(address ? { address } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      updatedBy: actor,
    },
  });

  return NextResponse.json({
    id: location.id,
    name: location.name,
    address: location.address,
    is_active: location.isActive,
  });
}

async function DELETEHandler(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body || (!body.id && body.id !== 0)) {
    return NextResponse.json(
      { error: "Location id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Location id is invalid" },
      { status: 400 },
    );
  }

  await prisma.pickupLocation.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      updatedBy: actor,
    },
  });

  return NextResponse.json({ ok: true });
}

// Wrapped centrally so every mutation purges the storefront caches.
export const POST = withCacheInvalidation(POSTHandler);
export const PUT = withCacheInvalidation(PUTHandler);
export const DELETE = withCacheInvalidation(DELETEHandler);
