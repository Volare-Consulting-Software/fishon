"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { List, MapPin, X } from "lucide-react";
import type {
  FishingSpot,
  GeoLocation,
  SpotKind,
} from "@volare-consulting/fishon";
import { SPOT_CATEGORIES } from "@/lib/spotCategories";
import { CopyButton } from "./CopyButton";

const SpotsMap = dynamic(() => import("./SpotsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-lg bg-sunken text-sm text-ink-3">
      Loading map…
    </div>
  ),
});

interface SpotsExplorerProps {
  center: GeoLocation;
  spots: FishingSpot[];
}

export function SpotsExplorer({ center, spots }: SpotsExplorerProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);

  function selectFromMap(index: number) {
    setSelected(index);
    setDrawerOpen(true);
  }
  function selectFromList(index: number) {
    setSelected(index);
  }

  // Closing the drawer clears the selection and zooms back out to the original
  // view that frames all nearby spots.
  function closeDrawer() {
    setDrawerOpen(false);
    setSelected(null);
    setFitKey((key) => key + 1);
  }

  useEffect(() => {
    if (selected === null || !drawerOpen) return;
    rowRefs.current[selected]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selected, drawerOpen]);

  const presentKinds = (Object.keys(SPOT_CATEGORIES) as SpotKind[])
    .map((kind) => ({
      kind,
      count: spots.filter((spot) => spot.kind === kind).length,
    }))
    .filter((entry) => entry.count > 0);

  return (
    <section className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MapPin className="h-4 w-4 text-brand" /> Area map — nearby spots &amp;
          structures
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          <List className="h-3.5 w-3.5" /> View all {spots.length} spots
        </button>
      </div>

      <div className="relative">
        <SpotsMap
          center={center}
          spots={spots}
          selectedIndex={selected}
          onSelect={selectFromMap}
          fitKey={fitKey}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {presentKinds.map(({ kind, count }) => {
          const { color, icon: Icon } = SPOT_CATEGORIES[kind];
          return (
            <span key={kind} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
              <span
                className="flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: color }}
              >
                <Icon className="h-2.5 w-2.5 text-white" />
              </span>
              {kind} ({count})
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Click a numbered marker (or the list) to zoom in and copy its
        latitude/longitude for your fishfinder or GPS.
      </p>

      <SpotsDrawer
        open={drawerOpen}
        spots={spots}
        selected={selected}
        rowRefs={rowRefs}
        onClose={closeDrawer}
        onSelect={selectFromList}
      />
    </section>
  );
}

interface SpotsDrawerProps {
  open: boolean;
  spots: FishingSpot[];
  selected: number | null;
  rowRefs: React.RefObject<(HTMLLIElement | null)[]>;
  onClose: () => void;
  onSelect: (index: number) => void;
}

function SpotsDrawer({
  open,
  spots,
  selected,
  rowRefs,
  onClose,
  onSelect,
}: SpotsDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="text-sm font-bold text-ink">
            Nearby spots &amp; structures ({spots.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-3 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="flex-1 divide-y divide-line overflow-y-auto">
          {spots.map((spot, index) => {
            const { color, icon: Icon } = SPOT_CATEGORIES[spot.kind];
            const isActive = index === selected;
            return (
              <li
                key={`${spot.name}-${index}`}
                ref={(node) => {
                  rowRefs.current[index] = node;
                }}
                className={`px-4 py-3 ${isActive ? "bg-brand-subtle" : ""}`}
              >
                {/* Row select/zoom and Copy are siblings — never nested buttons. */}
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  className="flex w-full items-start gap-3 text-left"
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: color }}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                      {spot.name}
                    </span>
                    <span className="block text-xs text-ink-3">
                      {spot.kind} · {spot.distanceMiles.toFixed(1)} mi
                      {spot.depthFeet !== undefined ? ` · ${spot.depthFeet} ft` : ""}
                      {spot.material ? ` · ${spot.material}` : ""} · {spot.source}
                    </span>
                  </span>
                </button>
                <div className="mt-1 flex items-center gap-2 pl-9">
                  <span className="font-mono text-xs text-ink-2">
                    {spot.lat.toFixed(5)}, {spot.lng.toFixed(5)}
                  </span>
                  <CopyButton value={`${spot.lat.toFixed(5)}, ${spot.lng.toFixed(5)}`} />
                </div>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
