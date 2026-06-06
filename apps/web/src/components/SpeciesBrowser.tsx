"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FishSpecies, SpeciesProfile } from "@volare-consulting/fishon";
import { Check, Fish, Loader2, Search, X } from "lucide-react";
import { FishImage } from "./FishImage";
import { EDIBILITY, RegulationChips, fishRulesLink } from "./SpeciesChipKit";

type WaterFilter = "all" | "salt" | "fresh";

interface SpeciesBrowserProps {
  species: FishSpecies[];
  /** Location string used to lazy-load a single profile when a card scrolls in. */
  location: string;
  /** Pre-fetched profiles used to seed the detail cache. */
  profiles?: SpeciesProfile[];
  /** Common names highlighted by the day's plan (link mode). */
  highlight?: string[];
  /** "panel" = standalone section (report); "embedded" = inside another panel (form). */
  variant?: "panel" | "embedded";
  /** When set, cards toggle selection instead of linking out to Fish Rules. */
  selectable?: boolean;
  /** Selected common names (select mode). */
  selected?: string[];
  onToggleSelect?: (commonName: string) => void;
}

export function SpeciesBrowser({
  species,
  location,
  profiles = [],
  highlight = [],
  variant = "panel",
  selectable = false,
  selected = [],
  onToggleSelect,
}: SpeciesBrowserProps) {
  const [query, setQuery] = useState("");
  const [water, setWater] = useState<WaterFilter>("all");
  const [details, setDetails] = useState<Record<string, SpeciesProfile>>(() =>
    Object.fromEntries(profiles.map((p) => [p.commonName.toLowerCase(), p]))
  );
  const requested = useRef<Set<string>>(new Set());

  const hi = useMemo(
    () => new Set(highlight.map((h) => h.toLowerCase())),
    [highlight]
  );
  const selectedSet = useMemo(
    () => new Set(selected.map((s) => s.toLowerCase())),
    [selected]
  );

  const loadProfile = useCallback(
    async (fish: FishSpecies) => {
      const key = fish.commonName.toLowerCase();
      if (requested.current.has(key)) return;
      requested.current.add(key);
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
        /* keep cheap chips */
      }
    },
    [location]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = species.filter((s) => {
      if (
        water !== "all" &&
        s.waterType &&
        s.waterType !== "both" &&
        s.waterType !== water
      )
        return false;
      if (!q) return true;
      return (
        s.commonName.toLowerCase().includes(q) ||
        s.scientificName.toLowerCase().includes(q)
      );
    });
    // Selected/plan-target species first, then alphabetical.
    return list.sort((a, b) => {
      const rank = (s: FishSpecies) =>
        selectedSet.has(s.commonName.toLowerCase()) ||
        hi.has(s.commonName.toLowerCase())
          ? 0
          : 1;
      const d = rank(a) - rank(b);
      return d !== 0 ? d : a.commonName.localeCompare(b.commonName);
    });
  }, [species, query, water, hi, selectedSet]);

  if (species.length === 0) return null;

  const panel = variant === "panel";

  return (
    <div
      className={
        panel ? "rounded-xl border border-line bg-raised p-5 shadow-sm" : ""
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {panel ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Fish className="h-4 w-4 text-brand" /> Fish you can target nearby
            <span className="text-ink-3">({filtered.length})</span>
          </div>
        ) : (
          <span className="text-xs text-ink-3">{filtered.length} species</span>
        )}
        <div className="flex items-center gap-2">
          <WaterTabs value={water} onChange={setWater} />
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fish…"
              className="w-40 rounded-md border border-line bg-surface py-1 pl-7 pr-2 text-xs text-ink outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {selectable && selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onToggleSelect?.(name)}
              className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-xs font-medium text-white"
            >
              <span className="capitalize">{name}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <div className={`${panel ? "max-h-[32rem]" : "max-h-[22rem]"} overflow-y-auto pr-1`}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((fish) => (
            <SpeciesCard
              key={fish.regulationId ?? fish.scientificName}
              fish={fish}
              detail={details[fish.commonName.toLowerCase()]}
              isTarget={hi.has(fish.commonName.toLowerCase())}
              selectable={selectable}
              isSelected={selectedSet.has(fish.commonName.toLowerCase())}
              onToggleSelect={onToggleSelect}
              onVisible={() => loadProfile(fish)}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="py-6 text-center text-xs text-ink-3">
            No fish match “{query}”.
          </p>
        )}
      </div>

      {panel && (
        <p className="mt-3 text-xs text-ink-3">
          Species & regulations via Fish Rules — bag, size, and season shown for
          your location; always confirm the full rules before keeping fish.
          Photos via iNaturalist/Fish Rules; edibility is a non-official signal.
        </p>
      )}
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
  isTarget: boolean;
  selectable: boolean;
  isSelected: boolean;
  onToggleSelect?: (commonName: string) => void;
  onVisible: () => void;
}

function SpeciesCard({
  fish,
  detail,
  isTarget,
  selectable,
  isSelected,
  onToggleSelect,
  onVisible,
}: SpeciesCardProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView && !detail) onVisible();
  }, [inView, detail, onVisible]);

  const edibility = detail
    ? EDIBILITY[detail.edibility] ?? EDIBILITY.unknown
    : null;

  const body = (
    <>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-sunken">
        <FishImage
          candidates={[fish.imageUrl, detail?.imageUrl]}
          alt={fish.commonName}
        />
        {selectable && isSelected && (
          <span className="absolute inset-0 flex items-center justify-center bg-brand/60">
            <Check className="h-6 w-6 text-white" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold capitalize text-ink">
            {fish.commonName}
          </span>
          {!selectable && isTarget && (
            <span className="shrink-0 rounded-full border border-brand/40 bg-brand-subtle px-1.5 text-[10px] font-medium text-brand">
              On your plan
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {detail?.regulation ? (
            <>
              <RegulationChips profile={detail} />
              {edibility && (
                <span
                  title={detail.edibilityNote ?? "Edibility unknown"}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${edibility.className}`}
                >
                  {edibility.label}
                </span>
              )}
            </>
          ) : (
            <CheapChips fish={fish} loading={!detail} />
          )}
        </div>
      </div>
    </>
  );

  const cls = `group flex gap-3 rounded-lg border bg-surface p-2 text-left transition ${
    isSelected
      ? "border-brand ring-1 ring-brand"
      : "border-line hover:border-brand hover:shadow-sm"
  }`;

  if (selectable) {
    return (
      <button
        ref={ref as React.RefObject<HTMLButtonElement>}
        type="button"
        aria-pressed={isSelected}
        onClick={() => onToggleSelect?.(fish.commonName)}
        className={cls}
      >
        {body}
      </button>
    );
  }

  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      href={detail ? fishRulesLink(detail) : "https://app.fishrulesapp.com/"}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${fish.commonName} on Fish Rules`}
      className={cls}
    >
      {body}
    </a>
  );
}

function CheapChips({ fish, loading }: { fish: FishSpecies; loading: boolean }) {
  return (
    <>
      {fish.prohibited ? (
        <Mini className="border-error/40 bg-error/10 text-error">No harvest</Mini>
      ) : fish.bagLimit === 0 ? (
        <Mini className="border-warning/40 bg-warning/10 text-warning">
          Catch &amp; release
        </Mini>
      ) : (
        fish.bagLimit !== null &&
        fish.bagLimit !== undefined && (
          <Mini className="border-brand/30 bg-brand-subtle text-brand">
            Bag {fish.bagLimit}
          </Mini>
        )
      )}
      {fish.waterType && fish.waterType !== "both" && (
        <Mini className="border-line bg-sunken text-ink-2">
          {fish.waterType === "salt" ? "Saltwater" : "Freshwater"}
        </Mini>
      )}
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
    </>
  );
}

function Mini({
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

// Fires once when the element first enters the viewport (incl. its scroll parent).
function useInView(ref: React.RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, inView]);
  return inView;
}
