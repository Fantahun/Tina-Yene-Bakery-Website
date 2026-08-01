/**
 * Forces the whole /checkout segment to render dynamically.
 *
 * The checkout pages are client components, and route segment config cannot be
 * exported from those - so this server-component layout carries it for the
 * segment.
 *
 * Without it Next prerendered /checkout, /checkout/payment and /checkout/success
 * as static HTML and served them with `Cache-Control: s-maxage=31536000`. Shared
 * caches then held that HTML for up to a year, including the **server action ID**
 * compiled into it. After any redeploy the running server had new action IDs
 * while the cache kept handing out the old page, so submitting the payment form
 * POSTed a dead ID and got "Server action not found" (404) - and a hard refresh
 * did not help, because the stale copy lived in a shared cache rather than the
 * browser.
 *
 * A checkout flow is per-user and stateful, so there was never a reason to cache
 * it. Rendering on demand keeps the action IDs in step with the deployed build.
 */
export const dynamic = "force-dynamic"

// Belt and braces: even if something upstream tries to cache the response,
// declare that it must not be stored.
export const fetchCache = "force-no-store"

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
