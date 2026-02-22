import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

async function requireAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.username) return null
  return session
}

function parseString(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function parseBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined
}

export async function GET() {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  })

  const mapped = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    image_url: category.imageUrl ?? "",
    sort_order: category.sortOrder,
    is_active: category.isActive,
  }))

  return NextResponse.json(mapped)
}

export async function POST(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 })

  const name = parseString(body.name)
  const description = parseString(body.description)
  const imageUrl = parseString(body.image_url ?? body.imageUrl)
  const slugInput = parseString(body.slug)
  const sortOrder = Number(body.sort_order ?? body.sortOrder ?? 0)
  const isActive = parseBoolean(body.is_active ?? body.isActive)

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const slug = slugInput ?? slugify(name)
  const existingSlug = await prisma.category.findUnique({ where: { slug } })
  if (existingSlug) {
    return NextResponse.json({ error: "slug already exists" }, { status: 409 })
  }

  const category = await prisma.category.create({
    data: {
      name,
      description,
      slug,
      imageUrl,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      isActive: isActive ?? true,
      createdBy: session.user.username,
      updatedBy: session.user.username,
    },
  })

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
  )
}

export async function PUT(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || (!body.id && body.id !== 0)) {
    return NextResponse.json({ error: "Category id is required" }, { status: 400 })
  }

  const id = Number(body.id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Category id is invalid" }, { status: 400 })
  }

  const name = parseString(body.name)
  const description = parseString(body.description)
  const imageUrl = parseString(body.image_url ?? body.imageUrl)
  const slugInput = parseString(body.slug)
  const sortOrder = Number(body.sort_order ?? body.sortOrder)
  const isActive = parseBoolean(body.is_active ?? body.isActive)

  const slug = slugInput ?? (name ? slugify(name) : null)
  if (slug) {
    const existingSlug = await prisma.category.findUnique({ where: { slug } })
    if (existingSlug && existingSlug.id !== id) {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 })
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
      updatedBy: session.user.username,
    },
  })

  return NextResponse.json({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    image_url: category.imageUrl ?? "",
    sort_order: category.sortOrder,
    is_active: category.isActive,
  })
}

export async function DELETE(req: Request) {
  const session = await requireAdminSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || (!body.id && body.id !== 0)) {
    return NextResponse.json({ error: "Category id is required" }, { status: 400 })
  }

  const id = Number(body.id)
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Category id is invalid" }, { status: 400 })
  }

  await prisma.category.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      updatedBy: session.user.username,
    },
  })

  return NextResponse.json({ ok: true })
}
