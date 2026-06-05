import { Fish } from "lucide-react";
import type { FishSpecies } from "@volare-consulting/fishon";

interface SpeciesChipsProps {
  species: FishSpecies[];
  highlight: string[];
}

export function SpeciesChips({ species, highlight }: SpeciesChipsProps) {
  if (species.length === 0) return null;
  const hi = new Set(highlight.map((h) => h.toLowerCase()));
  return (
    <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <Fish className="h-4 w-4 text-brand" /> Fish recorded nearby
      </div>
      <div className="flex flex-wrap gap-1.5">
        {species.map((s) => {
          const active = hi.has(s.commonName.toLowerCase());
          return (
            <span
              key={s.scientificName}
              title={`${s.scientificName} · ${s.occurrenceCount} records`}
              className={`rounded-full border px-2 py-0.5 text-xs capitalize ${
                active
                  ? "border-brand bg-brand-subtle font-semibold text-brand"
                  : "border-line bg-surface text-ink-2"
              }`}
            >
              {s.commonName}
            </span>
          );
        })}
      </div>
    </div>
  );
}
