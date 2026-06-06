"use client";

import { useEffect, useState } from "react";
import { Fish } from "lucide-react";

interface FishImageProps {
  /** Image sources tried in order; the first that loads wins. Falsy entries are skipped. */
  candidates: (string | undefined)[];
  alt: string;
}

// Walks a list of candidate image URLs (e.g. Fish Rules species image, then an
// iNaturalist photo). Fish Rules images 404 for ~half of species, so we fall
// through to the next source and only show the neutral glyph when all fail.
export function FishImage({ candidates, alt }: FishImageProps) {
  const urls = candidates.filter((c): c is string => !!c);
  const [index, setIndex] = useState(0);

  // When new candidates arrive (e.g. the lazy-loaded photo), retry from the top.
  useEffect(() => {
    setIndex(0);
  }, [urls.join("|")]);

  const src = urls[index];
  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-ink-3">
        <Fish className="h-7 w-7" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
