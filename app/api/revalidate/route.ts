import { revalidatePath } from "next/cache"
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

  return NextResponse.json({
    ok: true,
    message: "Revalidation queued successfully",
    paths,
  })
}
