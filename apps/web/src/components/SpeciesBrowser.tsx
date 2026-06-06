"use client";

import { useMemo, useState } from "react";
import type { FishSpecies, SpeciesProfile } from "@volare-consulting/fishon";
import { ExternalLink, Fish, Search, Loader2 } from "lucide-react";
import { FishImage } from "./FishImage";
import { EDIBILITY, RegulationChips, fishRulesLink } from "./SpeciesChipKit";

type WaterFilter = "all" | "salt" | "fresh";

interface SpeciesBrowserProps {
  species: FishSpecies[];
  /** Pre-fetched profiles (target/featured species) used to seed the detail cache. */
  profiles: SpeciesProfile[];
  /** Common names highlighted by the day's plan. */
  highlight: string[];
  /** Location string used to lazy-load a single profile on expand. */
  location: string;
}

export function SpeciesBrowser({
  species,
  profiles,
  highlight,
  location,
}: SpeciesBrowserProps) {
  const [query, setQuery] = useState("");
  const [water, setWater] = useState<WaterFilter>("all");
  // Detail cache keyed by lowercased common name, seeded with pre-fetched ones.
  const [details, setDetails] = useState<Record<string, SpeciesProfile>>(() =>
    Object.fromEntries(profiles.map((p) => [p.commonName.toLowerCase(), p]))
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const hi = useMemo(
    () => new Set(highlight.map((h) => h.toLowerCase())),
    [highlight]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = species.filter((s) => {
      if (water !== "all" && s.waterType && s.waterType !== "both" && s.waterType !== water)
        return false;
      if (!q) return true;
      return (
        s.commonName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q)
      );
    });
    // Plan targets first, then alphabetical.
    return list.sort((a, b) => {
      const ah = hi.has(a.commonName.toLowerCase()) ? 0 : 1;
      const bh = hi.has(b.commonName.toLowerCase()) ? 0 : 1;
      if (ah !== bh) return ah - bh;
      return a.commonName.localeCompare(b.commonName);
    });
  }, [species, query, water, hi]);

  async function toggle(fish: FishSpecies) {
    const key = fish.commonName.toLowerCase();
    if (expanded === key) {
      setExpanded(null);
      return;
    }
    setExpanded(key);
    if (details[key] || loading) return;
    setLoading(key);
    try {
      const res = await fetch(
        `/api/species/profiles?location=${encodeURIComponent(
          location
        )}&names=${encodeURIComponent(fish.commonName)}`
      );
      if (res.ok) {
        const found: SpeciesProfile[] = await res.json();
        if (found[0]) setDetails((d) => ({ ...d, [key]: found[0]! }));
      }
    } catch {
      // Leave uncached; the card still shows its summary chips.
    } finally {
      setLoading(null);
    }
  }

  if (species.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Fish className="h-4 w-4 text-brand" /> Fish you can target nearby
          <span className="text-ink-3">({filtered.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <WaterTabs value={water} onChange={setWater} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fish…"
              className="w-44 rounded-md border border-line bg-surface py-1 pl-7 pr-2 text-xs text-ink outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      <div className="max-h-[30rem] overflow-y-auto pr-1">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((fish) => {
            const key = fish.commonName.toLowerCase();
            return (
              <SpeciesCard
                key={fish.regulationId ?? fish.scientificName}
                fish={fish}
                detail={details[key]}
                isExpanded={expanded === key}
                isLoading={loading === key}
                isTarget={hi.has(key)}
                onToggle={() => toggle(fish)}
              />
            );
          })}
        </div>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-3">
            No fish match “{query}”.
          </p>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-3">
        Species & regulations via Fish Rules — bag, size, and season are shown
        for your location; always confirm the full rules before keeping fish.
        Edibility is a non-official, best-effort signal.
      </p>
    </div>
  );
}

function WaterTabs({
  value,
  onChange,
}: {
  value: WaterFilter;
  onChange: (v: WaterFilter) => void;
}) {
  const tabs: { key: WaterFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "salt", label: "Salt" },
    { key: "fresh", label: "Fresh" },
  ];
  return (
    <div className="flex rounded-md border border-line bg-surface p-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={`rounded px-2 py-0.5 text-xs font-medium transition ${
            value === t.key
              ? "bg-brand-subtle text-brand"
              : "text-ink-3 hover:text-ink-2"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface SpeciesCardProps {
  fish: FishSpecies;
  detail?: SpeciesProfile;
  isExpanded: boolean;
  isLoading: boolean;
  isTarget: boolean;
  onToggle: () => void;
}

function SpeciesCard({
  fish,
  detail,
  isExpanded,
  isLoading,
  isTarget,
  onToggle,
}: SpeciesCardProps) {
  const edibility = detail ? EDIBILITY[detail.edibility] ?? EDIBILITY.unknown : null;
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border bg-surface transition ${
        isExpanded ? "border-brand shadow-sm" : "border-line hover:border-brand/60"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-3 p-2 text-left"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-sunken">
          <FishImage src={fish.imageUrl} alt={fish.commonName} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold capitalize text-ink">
              {fish.commonName}
            </span>
            {isTarget && (
              <span className="shrink-0 rounded-full border border-brand/40 bg-brand-subtle px-1.5 text-[10px] font-medium text-brand">
                On your plan
              </span>
            )}
          </div>
          <div className="truncate text-xs italic text-ink-3">
            {fish.scientificName}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {fish.prohibited ? (
              <MiniChip className="border-error/40 bg-error/10 text-error">
                No harvest
              </MiniChip>
            ) : (
              fish.bagLimit !== null &&
              fish.bagLimit !== undefined && (
                <MiniChip className="border-brand/30 bg-brand-subtle text-brand">
                  Bag {fish.bagLimit}
                </MiniChip>
              )
            )}
            {fish.waterType && fish.waterType !== "both" && (
              <MiniChip className="border-line bg-sunken text-ink-2">
                {fish.waterType === "salt" ? "Saltwater" : "Freshwater"}
              </MiniChip>
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-line p-3">
          {isLoading && !detail ? (
            <div className="flex items-center gap-2 text-xs text-ink-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading regulations…
            </div>
          ) : detail ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {edibility && (
                  <span
                    title={detail.edibilityNote ?? "Edibility unknown"}
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${edibility.className}`}
                  >
                    {edibility.label}
                  </span>
                )}
                <RegulationChips profile={detail} />
              </div>
              {detail.summary && (
                <p className="line-clamp-4 text-xs text-ink-2">{detail.summary}</p>
              )}
              <a
                href={fishRulesLink(detail)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Full rules on Fish Rules
              </a>
            </div>
          ) : (
            <p className="text-xs text-ink-3">
              Couldn’t load detailed rules — check Fish Rules directly.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MiniChip({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${className}`}
    >
      {children}
    </span>
  );
}
