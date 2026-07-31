import "server-only"

import { NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { PUBLIC_PATHS } from "@/lib/isr"

/**
 * Public storefront pages render on demand but cache their database queries (see
 * app/page.tsx, app/shop/page.tsx, app/shop/[slug]/page.tsx). Writing to the
 * database is therefore not enough to change what visitors see - the matching
 * cache entries have to be purged too, or an admin edit stays invisible until
 * the revalidation window expires.
 */

// "max" expires the entry immediately and lets the next request repopulate it.
const IMMEDIATE = "max" as const

/**
 * Every tag used by a cached storefront query. Any admin write clears all of
 * them rather than trying to work out which ones matter: the caches are small
 * and repopulate on the next request, whereas a missed tag means an admin edit
 * silently does not appear. Correctness over precision - this is not a hot path.
 *
 * When you add a new cached query, add its tag here too.
 */
const ALL_STOREFRONT_TAGS = [
  "home-data",
  "shop-data",
  "products",
  "categories",
  "site-settings",
  "pickup-locations",
] as const

/** Purge every storefront cache. `slug` additionally clears one product page. */
export function revalidateStorefront(slug?: string | null) {
  for (const tag of ALL_STOREFRONT_TAGS) {
    revalidateTag(tag, IMMEDIATE)
  }
  if (slug) {
    revalidateTag(`product:${slug}`, IMMEDIATE)
  }

  // Purge the rendered pages too. The data cache is what usually goes stale, but
  // dropping the route cache as well means a hard refresh always shows the edit.
  for (const publicPath of Object.values(PUBLIC_PATHS)) {
    revalidatePath(publicPath)
  }
  if (slug) {
    revalidatePath(`/shop/${slug}`)
  }
}

/** HTTP methods that change data and therefore require a cache purge. */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

type RouteHandler = (
  request: Request,
  context?: unknown,
) => Promise<Response> | Response

/**
 * Wraps a route handler so any successful mutating request purges the storefront
 * caches automatically.
 *
 * This is applied centrally in app/api/admin/route-wrapper.ts rather than called
 * by hand in each route, so **admin endpoints added in future revalidate without
 * anyone remembering to wire them up**. Per-route calls were the alternative and
 * they rot: a new endpoint, or a new handler in an existing file, silently skips
 * invalidation and the bug only shows up as "my edit did not appear".
 *
 * Read requests and failed writes (4xx/5xx) are left alone - nothing changed, so
 * there is nothing to purge.
 */
export function withCacheInvalidation(handler: RouteHandler): RouteHandler {
  return async (request: Request, context?: unknown) => {
    const response = await handler(request, context)

    if (!MUTATING_METHODS.has(request.method)) return response
    if (!response.ok) return response

    // A product write returns the affected record; use its slug to clear that
    // product's own page as well. Reading the body consumes it, so hand back a
    // clone with the original payload intact.
    let slug: string | null = null
    let bodyForClient: string | null = null

    try {
      bodyForClient = await response.clone().text()
      const parsed = JSON.parse(bodyForClient) as { slug?: unknown }
      if (typeof parsed?.slug === "string") slug = parsed.slug
    } catch {
      // Empty or non-JSON responses are fine; the global purge still runs.
    }

    revalidateStorefront(slug)

    if (bodyForClient === null) return response
    return new NextResponse(bodyForClient, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}
