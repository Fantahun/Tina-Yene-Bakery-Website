import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withCacheInvalidation } from "@/lib/cache-invalidation";
import { normalizeImageUrl } from "@/lib/image-url";

const IMAGE_URL_ERROR =
  "image_url must be a path on this site (/images/photo.jpg) or a full URL (https://example.com/photo.jpg)";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

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

/**
 * Null when no image was supplied, which every caller reads as "leave the
 * stored value alone". `false` marks a value that was supplied but cannot be
 * rendered, so the caller can reject it instead of saving a broken image.
 */
function parseImageUrl(value: unknown): string | null | false {
  const provided = parseString(value);
  if (provided === null) return null;
  return normalizeImageUrl(provided) ?? false;
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  const mapped = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    image_url: category.imageUrl ?? "",
    sort_order: category.sortOrder,
    is_active: category.isActive,
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
  const imageUrl = parseImageUrl(body.image_url ?? body.imageUrl);
  const slugInput = parseString(body.slug);
  const sortOrder = Number(body.sort_order ?? body.sortOrder ?? 0);
  const isActive = parseBoolean(body.is_active ?? body.isActive);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  if (imageUrl === false) {
    return NextResponse.json({ error: IMAGE_URL_ERROR }, { status: 400 });
  }

  const slug = slugInput ?? slugify(name);
  const existingSlug = await prisma.category.findUnique({ where: { slug } });
  if (existingSlug) {
    return NextResponse.json({ error: "slug already exists" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
      slug,
      imageUrl,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: isActive ?? true,
      createdBy: actor,
      updatedBy: actor,
    },
  });

  return NextResponse.json(
    {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image_url: category.imageUrl ?? "",
      sort_order: category.sortOrder,
      is_active: category.isActive,
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
      { error: "Category id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Category id is invalid" },
      { status: 400 },
    );
  }

  const name = parseString(body.name);
  const description = parseString(body.description);
  const imageUrl = parseImageUrl(body.image_url ?? body.imageUrl);
  const slugInput = parseString(body.slug);
  const sortOrder = Number(body.sort_order ?? body.sortOrder);
  const isActive = parseBoolean(body.is_active ?? body.isActive);

  if (imageUrl === false) {
    return NextResponse.json({ error: IMAGE_URL_ERROR }, { status: 400 });
  }

  const slug = slugInput ?? (name ? slugify(name) : null);
  if (slug) {
    const existingSlug = await prisma.category.findUnique({ where: { slug } });
    if (existingSlug && existingSlug.id !== id) {
      return NextResponse.json(
        { error: "slug already exists" },
        { status: 409 },
      );
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== null ? { description } : {}),
      ...(slug ? { slug } : {}),
      ...(imageUrl !== null ? { imageUrl } : {}),
      ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      updatedBy: actor,
    },
  });

  return NextResponse.json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    image_url: category.imageUrl ?? "",
    sort_order: category.sortOrder,
    is_active: category.isActive,
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
      { error: "Category id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Category id is invalid" },
      { status: 400 },
    );
  }

  await prisma.category.update({
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
