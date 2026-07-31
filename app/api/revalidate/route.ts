import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizePublicRevalidatePaths } from "@/lib/isr"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const body = await request.json().catch(() => null)

  const providedSecret =
    request.headers.get("x-revalidate-secret") ??
    (typeof body?.secret === "string" ? body.secret : null)

  const revalidateSecret = process.env.REVALIDATE_SECRET
  const secretIsValid = Boolean(revalidateSecret && providedSecret === revalidateSecret)
  const isAuthenticatedAdmin = Boolean(session?.user?.username)

  // Browser-triggered revalidation is allowed only for authenticated admins.
  // Secret-based access remains available for server-to-server automation.
  if (!isAuthenticatedAdmin && !secretIsValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const target = typeof body?.target === "string" ? body.target : ""
  const slug = typeof body?.slug === "string" ? body.slug : null
  const paths = normalizePublicRevalidatePaths(target, slug)

  if (paths.length === 0) {
    return NextResponse.json({ error: "No public paths matched the request" }, { status: 400 })
  }

  if (target === "all") {
    const productSlugs = await prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        category: {
          isActive: true,
          deletedAt: null,
        },
      },
      select: { slug: true },
    })

    for (const product of productSlugs) {
      revalidatePath(`/shop/${product.slug}`)
    }
  }

  // On-demand ISR keeps serving the previous cached response until the fresh page is ready.
  for (const path of paths) {
    revalidatePath(path)
  }

  // The DB-backed pages render on demand and cache their *queries* via
  // unstable_cache, which revalidatePath does not clear. Purge the matching tags
  // too, or an admin edit would not appear until the 24h window expired.
  const tags = new Set<string>()
  switch (target) {
    case "all":
      tags.add("products").add("categories").add("home-data").add("shop-data")
      break
    case "home":
      tags.add("home-data")
      break
    case "shop":
      tags.add("shop-data").add("products")
      break
    case "product":
      tags.add("products").add("shop-data").add("home-data")
      if (slug) tags.add(`product:${slug}`)
      break
  }

  // Next 16 requires a cache-life profile; "max" expires the entry immediately
  // and lets the next request repopulate it.
  for (const tag of tags) {
    revalidateTag(tag, "max")
  }

  return NextResponse.json({
    ok: true,
    message: "Revalidation queued successfully",
    paths,
    tags: [...tags],
  })
}
