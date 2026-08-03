"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

import { PLACEHOLDER_IMAGE, resolveImageSrc } from "@/lib/image-url";

type CatalogueImageProps = Omit<ImageProps, "src" | "unoptimized"> & {
  /** The raw `image_url` from the database. May be empty, or an invalid URL. */
  src: string | null | undefined;
  fallbackSrc?: string;
};

/**
 * `next/image` for pictures whose src comes from the admin panel rather than
 * from the repository. It adds the two things an admin-supplied URL needs:
 *
 *   - remote hosts render unoptimized, so no `images.remotePatterns` entry and
 *     no redeploy is required to use a URL from another site (see lib/image-url.ts)
 *   - a URL that 404s, or a host that goes away, degrades to the placeholder
 *     instead of leaving a broken image on the storefront
 */
export function CatalogueImage({
  src,
  fallbackSrc = PLACEHOLDER_IMAGE,
  ...rest
}: CatalogueImageProps) {
  // Records *which* src failed rather than a plain boolean, so changing a
  // product's image in the admin panel retries the new URL instead of leaving
  // the component stuck on the placeholder.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const resolved = resolveImageSrc(src, fallbackSrc);
  const useFallback = failedSrc === resolved.src;

  return (
    <Image
      {...rest}
      src={useFallback ? fallbackSrc : resolved.src}
      unoptimized={!useFallback && resolved.isRemote}
      onError={() => setFailedSrc(resolved.src)}
    />
  );
}
