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

  const statuses = await prisma.orderStatusEntry.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const mapped = statuses.map((status) => ({
    id: status.id,
    name: status.name,
    description: status.description ?? "",
    sort_order: status.sortOrder,
    is_active: status.isActive,
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
  const description = parseString(body.description);
  const sortOrder = Number(body.sort_order ?? body.sortOrder ?? 0);
  const isActive = parseBoolean(body.is_active ?? body.isActive);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.orderStatusEntry.findUnique({
    where: { name },
  });
  if (existing) {
    return NextResponse.json({ error: "name already exists" }, { status: 409 });
  }

  const status = await prisma.orderStatusEntry.create({
    data: {
      name,
      description,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: isActive ?? true,
      createdBy: actor,
      updatedBy: actor,
    },
  });

  return NextResponse.json(
    {
      id: status.id,
      name: status.name,
      description: status.description ?? "",
      sort_order: status.sortOrder,
      is_active: status.isActive,
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
      { error: "Status id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Status id is invalid" },
      { status: 400 },
    );
  }

  const name = parseString(body.name);
  const description = parseString(body.description);
  const sortOrder = Number(body.sort_order ?? body.sortOrder);
  const isActive = parseBoolean(body.is_active ?? body.isActive);

  if (name) {
    const existing = await prisma.orderStatusEntry.findUnique({
      where: { name },
    });
    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "name already exists" },
        { status: 409 },
      );
    }
  }

  const status = await prisma.orderStatusEntry.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== null ? { description } : {}),
      ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      updatedBy: actor,
    },
  });

  return NextResponse.json({
    id: status.id,
    name: status.name,
    description: status.description ?? "",
    sort_order: status.sortOrder,
    is_active: status.isActive,
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
      { error: "Status id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Status id is invalid" },
      { status: 400 },
    );
  }

  await prisma.orderStatusEntry.update({
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
