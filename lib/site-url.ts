import "server-only"

/**
 * The site's public origin, used anywhere an absolute URL has to leave the
 * server: Stripe redirect targets, product images sent to Stripe, email links.
 *
 * Read at runtime, so it comes from Hostinger's environment panel rather than
 * being baked into the build. That is also why it fails loudly: if the panel is
 * missing the variable, `${process.env.NEXT_PUBLIC_BASE_URL}` silently produced
 * "undefined/checkout/success" or a localhost URL, and Stripe redirected real
 * customers to a page that only exists on a developer's machine. A thrown error
 * at checkout is far easier to diagnose than a redirect that half-works.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim()

  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL is not set. Set it to the site's public origin " +
        "(e.g. https://yenebakery.com) in the hosting environment panel.",
    )
  }

  if (process.env.NODE_ENV === "production" && isLocalOrigin(raw)) {
    throw new Error(
      `NEXT_PUBLIC_BASE_URL is "${raw}", which is a local address. Stripe and ` +
        "email links would point customers at their own machine. Set it to the " +
        "site's public origin in the hosting environment panel.",
    )
  }

  // Trailing slashes would produce "https://site.com//checkout/success".
  return raw.replace(/\/+$/, "")
}

/** True for origins that only resolve on the machine running the server. */
export function isLocalOrigin(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(url)
}

/**
 * The site URL when it is publicly reachable, otherwise null. Use for optional
 * things - Stripe fetches product images from the URL you give it, so a local
 * address should be omitted rather than sent and rejected.
 */
export function getPublicSiteUrlOrNull(): string | null {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (!raw || isLocalOrigin(raw)) return null
  return raw.replace(/\/+$/, "")
}
