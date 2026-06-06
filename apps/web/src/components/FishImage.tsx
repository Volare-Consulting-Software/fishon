"use client";

import { useState } from "react";
import { Fish } from "lucide-react";

interface FishImageProps {
  src?: string;
  alt: string;
}

// Fish Rules photos are constructed from the species id and occasionally 404.
// On error we fall back to a neutral fish glyph rather than a broken image.
export function FishImage({ src, alt }: FishImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full items-center justify-center text-ink-3">
        <Fish className="h-8 w-8" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}
