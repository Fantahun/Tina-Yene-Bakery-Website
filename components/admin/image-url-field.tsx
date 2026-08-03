"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeImageUrl } from "@/lib/image-url";

interface ImageUrlFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Names the thing being pictured, e.g. "Product". Used in the preview alt. */
  subject: string;
}

/**
 * The "Image URL" input shared by the product and category dialogs, with a live
 * preview that tells the admin whether the URL actually works *before* they
 * save it - the same check the API applies on write.
 */
export function ImageUrlField({ value, onChange, subject }: ImageUrlFieldProps) {
  const inputId = useId();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const preview = normalizeImageUrl(value);
  const isUnusable = value.trim().length > 0 && preview === null;
  const didFail = preview !== null && failedSrc === preview;

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Image URL</Label>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/images/sourdough.jpg or https://example.com/image.jpg"
        aria-invalid={isUnusable || undefined}
      />
      <p className="text-xs text-muted-foreground">
        Either a file in the site&apos;s images folder (starting with{" "}
        <code>/images/</code>) or a full link to an image hosted on another site
        (starting with <code>https://</code>).
      </p>

      {isUnusable ? (
        <p className="text-xs text-destructive">
          This is not a usable image location. It has to start with{" "}
          <code>/</code> for a file on this site, or with <code>https://</code>{" "}
          for an image hosted elsewhere.
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-2">
          <Label>Preview</Label>
          {didFail ? (
            <div className="flex h-32 w-32 items-center justify-center rounded-md border border-dashed border-destructive p-2 text-center text-xs text-destructive">
              Nothing loaded from this URL. Check that it opens in a browser and
              points straight at an image file.
            </div>
          ) : (
            /* A plain <img>, not next/image: this previews a URL that has not
               been saved yet, so there is nothing to optimise and no reason to
               make the server fetch a picture only one admin will look at. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={`${subject} preview`}
              className="h-32 w-32 rounded-md border border-border object-cover"
              onError={() => setFailedSrc(preview)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
