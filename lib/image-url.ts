/**
 * Shared handling for the "Image URL" that admins type into the product and
 * category dialogs. Two shapes are supported:
 *
 *   - a path inside `public/`, e.g. `/images/sourdough.jpg`
 *   - a full URL on any other host, e.g. `https://cdn.example.com/bread.jpg`
 *
 * Remote images are flagged so the call site can render them with
 * `unoptimized`, which matters for two reasons:
 *
 * 1. Resources. The built-in optimiser makes the *server* fetch the remote
 *    image and re-encode it with sharp once per requested size, then cache the
 *    result on disk. That is an outbound socket, libvips threads and new inodes
 *    per image - on a host already capped at 120 processes and 600k inodes.
 *    Unoptimized images are loaded by the browser straight from their origin,
 *    so the server does no work at all.
 *
 * 2. Configuration. `next/image` only optimises hosts listed in
 *    `images.remotePatterns`, and an unlisted host fails - it throws in dev and
 *    returns a 400 from `/_next/image` in production, which is exactly the
 *    broken-image symptom this module exists to fix. `unoptimized` skips that
 *    allowlist, so an admin can paste a URL from any site without a config
 *    change, a rebuild and a redeploy.
 *
 * The trade-off is that remote images are served at their original size and
 * format. Prefer a local file under `public/images/` when one exists.
 */

/** Shown when an image is missing or its URL cannot be rendered. */
export const PLACEHOLDER_IMAGE = "/placeholder.jpg"

/** True for an absolute URL pointing at some other host. */
export function isRemoteImageUrl(value: string): boolean {
  return /^https?:\/\//i.test(value)
}

/**
 * The canonical form of an image location, or null when the value could never
 * load as an image. Used both by the admin API routes, to reject bad input at
 * the point it is saved, and by the UI, so the preview an admin sees and the
 * image customers get are decided by the same rules.
 */
export function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null

  const trimmed = value.trim()
  if (!trimmed) return null

  if (isRemoteImageUrl(trimmed)) {
    try {
      const url = new URL(trimmed)
      // "https://" on its own parses but has no host to fetch from.
      return url.hostname ? url.toString() : null
    } catch {
      return null
    }
  }

  // next/image rejects protocol-relative URLs outright, and "//images/x.jpg" is
  // in practice a typo rather than a deliberate choice.
  if (trimmed.startsWith("//")) return null

  // Refuse every other scheme - javascript:, data:, file:. A plain path such as
  // "images/x.jpg" holds no colon and falls through.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null

  // Treated as a path inside `public/`. The leading slash is easy to forget and
  // "images/x.jpg" is unambiguous, so add it rather than rejecting the value.
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

export interface ResolvedImage {
  /** Safe to hand to `next/image` or a plain `<img>`. */
  src: string
  /** Hosted elsewhere, so it must bypass the built-in optimiser. */
  isRemote: boolean
}

/** Resolves a stored `image_url` to a renderable src, falling back when unset. */
export function resolveImageSrc(
  value: string | null | undefined,
  fallback: string = PLACEHOLDER_IMAGE,
): ResolvedImage {
  const normalized = normalizeImageUrl(value)
  const src = normalized ?? fallback
  return { src, isRemote: isRemoteImageUrl(src) }
}
