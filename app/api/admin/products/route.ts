import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const selectProductForAdmin = {
  id: true,
  name: true,
  description: true,
  price: true,
  hasSizes: true,
  slug: true,
  imageUrl: true,
  prepLeadTimeDays: true,
  pickupAllowed: true,
  deliveryAllowed: true,
  isActive: true,
  sortOrder: true,
  categoryId: true,
  sizes: {
    select: {
      id: true,
      name: true,
      serves: true,
      price: true,
      isActive: true,
      sortOrder: true,
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
  category: { select: { name: true } },
} satisfies Prisma.ProductSelect;

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

function parseSizes(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((size, index) => {
      if (!size || typeof size !== "object") return null;
      const candidate = size as Record<string, unknown>;
      const name = parseString(candidate.name);
      const serves = parseString(candidate.serves);
      const price = Number(candidate.price);
      const isActive = parseBoolean(candidate.is_active ?? candidate.isActive);
      const sortOrder = Number(
        candidate.sort_order ?? candidate.sortOrder ?? index,
      );

      if (!name || !Number.isFinite(price) || price < 0) return null;

      return {
        name,
        serves,
        price,
        isActive: isActive ?? true,
        sortOrder: Number.isFinite(sortOrder) ? sortOrder : index,
      };
    })
    .filter((size): size is NonNullable<typeof size> => size !== null);
}

export async function GET() {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
    select: selectProductForAdmin,
  });

  const mapped = products.map((product) => ({
    id: product.id,
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: Number(product.price),
    has_sizes: product.hasSizes,
    sizes: product.sizes.map((size) => ({
      id: size.id,
      name: size.name,
      serves: size.serves ?? "",
      price: Number(size.price),
      is_active: size.isActive,
      sort_order: size.sortOrder,
    })),
    image_url: product.imageUrl ?? "",
    prep_lead_time_days: product.prepLeadTimeDays,
    pickup_allowed: product.pickupAllowed,
    delivery_allowed: product.deliveryAllowed,
    is_active: product.isActive,
    sort_order: product.sortOrder,
    category: product.category?.name ?? "",
  }));

  return NextResponse.json(mapped);
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body)
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const name = parseString(body.name);
  const description = parseString(body.description);
  const imageUrl = parseString(body.image_url ?? body.imageUrl);
  const slugInput = parseString(body.slug);
  const categoryId = Number(body.category_id ?? body.categoryId);
  const price = Number(body.price);
  const prepLeadTimeDays = Number(
    body.prep_lead_time_days ?? body.prepLeadTimeDays ?? 0,
  );
  const hasSizes = parseBoolean(body.has_sizes ?? body.hasSizes);
  const sizes = parseSizes(body.sizes);
  const pickupAllowed = parseBoolean(body.pickup_allowed ?? body.pickupAllowed);
  const deliveryAllowed = parseBoolean(
    body.delivery_allowed ?? body.deliveryAllowed,
  );
  const isActive = parseBoolean(body.is_active ?? body.isActive);
  const sortOrder = Number(body.sort_order ?? body.sortOrder ?? 0);

  if (!name || !Number.isFinite(price) || !Number.isInteger(categoryId)) {
    return NextResponse.json(
      { error: "name, categoryId, and price are required" },
      { status: 400 },
    );
  }

  if ((hasSizes ?? false) && sizes.length === 0) {
    return NextResponse.json(
      { error: "At least one valid size is required when hasSizes is enabled" },
      { status: 400 },
    );
  }

  const slug = slugInput ?? slugify(name);
  const existingSlug = await prisma.product.findUnique({ where: { slug } });
  if (existingSlug) {
    return NextResponse.json({ error: "slug already exists" }, { status: 409 });
  }

  const product = await prisma.product.create({
    data: {
      name,
      description,
      slug,
      categoryId,
      price,
      hasSizes: hasSizes ?? false,
      imageUrl,
      prepLeadTimeDays: Number.isFinite(prepLeadTimeDays)
        ? prepLeadTimeDays
        : 0,
      pickupAllowed: pickupAllowed ?? true,
      deliveryAllowed: deliveryAllowed ?? true,
      isActive: isActive ?? true,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      sizes: sizes.length
        ? {
            create: sizes,
          }
        : undefined,
      createdBy: actor,
      updatedBy: actor,
    },
    select: selectProductForAdmin,
  });

  return NextResponse.json(
    {
      id: product.id,
      category_id: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: Number(product.price),
      has_sizes: product.hasSizes,
      sizes: product.sizes.map((size) => ({
        id: size.id,
        name: size.name,
        serves: size.serves ?? "",
        price: Number(size.price),
        is_active: size.isActive,
        sort_order: size.sortOrder,
      })),
      image_url: product.imageUrl ?? "",
      prep_lead_time_days: product.prepLeadTimeDays,
      pickup_allowed: product.pickupAllowed,
      delivery_allowed: product.deliveryAllowed,
      is_active: product.isActive,
      sort_order: product.sortOrder,
      category: product.category?.name ?? "",
    },
    { status: 201 },
  );
}

export async function PUT(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body || (!body.id && body.id !== 0)) {
    return NextResponse.json(
      { error: "Product id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Product id is invalid" },
      { status: 400 },
    );
  }

  const name = parseString(body.name);
  const description = parseString(body.description);
  const imageUrl = parseString(body.image_url ?? body.imageUrl);
  const slugInput = parseString(body.slug);
  const categoryId = Number(body.category_id ?? body.categoryId);
  const price = Number(body.price);
  const prepLeadTimeDays = Number(
    body.prep_lead_time_days ?? body.prepLeadTimeDays,
  );
  const hasSizes = parseBoolean(body.has_sizes ?? body.hasSizes);
  const sizes = Array.isArray(body.sizes) ? parseSizes(body.sizes) : null;
  const pickupAllowed = parseBoolean(body.pickup_allowed ?? body.pickupAllowed);
  const deliveryAllowed = parseBoolean(
    body.delivery_allowed ?? body.deliveryAllowed,
  );
  const isActive = parseBoolean(body.is_active ?? body.isActive);
  const sortOrder = Number(body.sort_order ?? body.sortOrder);

  if (hasSizes === true && sizes !== null && sizes.length === 0) {
    return NextResponse.json(
      { error: "At least one valid size is required when hasSizes is enabled" },
      { status: 400 },
    );
  }

  const slug = slugInput ?? (name ? slugify(name) : null);
  if (slug) {
    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug && existingSlug.id !== id) {
      return NextResponse.json(
        { error: "slug already exists" },
        { status: 409 },
      );
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(description !== null ? { description } : {}),
      ...(slug ? { slug } : {}),
      ...(Number.isInteger(categoryId) ? { categoryId } : {}),
      ...(Number.isFinite(price) ? { price } : {}),
      ...(hasSizes !== undefined ? { hasSizes } : {}),
      ...(imageUrl !== null ? { imageUrl } : {}),
      ...(Number.isFinite(prepLeadTimeDays) ? { prepLeadTimeDays } : {}),
      ...(pickupAllowed !== undefined ? { pickupAllowed } : {}),
      ...(deliveryAllowed !== undefined ? { deliveryAllowed } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
      ...(sizes
        ? {
            sizes: {
              deleteMany: {},
              create: sizes,
            },
          }
        : hasSizes === false
          ? {
              sizes: {
                deleteMany: {},
              },
            }
          : {}),
      updatedBy: actor,
    },
    select: selectProductForAdmin,
  });

  return NextResponse.json({
    id: product.id,
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: Number(product.price),
    has_sizes: product.hasSizes,
    sizes: product.sizes.map((size) => ({
      id: size.id,
      name: size.name,
      serves: size.serves ?? "",
      price: Number(size.price),
      is_active: size.isActive,
      sort_order: size.sortOrder,
    })),
    image_url: product.imageUrl ?? "",
    prep_lead_time_days: product.prepLeadTimeDays,
    pickup_allowed: product.pickupAllowed,
    delivery_allowed: product.deliveryAllowed,
    is_active: product.isActive,
    sort_order: product.sortOrder,
    category: product.category?.name ?? "",
  });
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = session.user!.username;

  const body = await req.json().catch(() => null);
  if (!body || (!body.id && body.id !== 0)) {
    return NextResponse.json(
      { error: "Product id is required" },
      { status: 400 },
    );
  }

  const id = Number(body.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { error: "Product id is invalid" },
      { status: 400 },
    );
  }

  await prisma.product.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      updatedBy: actor,
    },
  });

  return NextResponse.json({ ok: true });
}
