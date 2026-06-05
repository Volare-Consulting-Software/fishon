"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  CalendarDays,
  Clock,
  Fish,
  History as HistoryIcon,
  MapPin,
  Search,
  X,
} from "lucide-react";
import type {
  FishSpecies,
  GeoSuggestion,
} from "@volare-consulting/fishweather-forecast";
import { FishingMethod } from "@/types/fishingTripRequest";
import { TimeOfDay } from "@/types/timeOfDay";
import { FishingDayReport } from "@/types/fishingDayReport";
import {
  loadHistory,
  savePlan,
  removePlan,
  newPlanId,
  type SavedPlan,
} from "@/lib/planHistory";
import { LoadingSplash } from "./LoadingSplash";
import { ReportView } from "./ReportView";

const WINDOW_DAYS = 14;
const TIMES: { key: TimeOfDay; label: string }[] = [
  { key: "morning", label: "Morning" },
  { key: "midday", label: "Midday" },
  { key: "evening", label: "Evening" },
  { key: "fullday", label: "Full day" },
];
const METHODS: { key: FishingMethod; label: string }[] = [
  { key: "shoreline", label: "Shoreline" },
  { key: "nearshore", label: "Nearshore" },
  { key: "offshore", label: "Offshore" },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoToDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, day ?? 1);
}
function labelFor(iso: string): string {
  return isoToDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
// Strip autocomplete cruft so the scraper/geocoder gets a clean "City, ST".
function cleanLocation(text: string): string {
  return text
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/,\s*USA\b/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface text-ink-2 hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

export function TripForm() {
  const today = new Date();
  const todayIso = toIso(today);
  const maxIso = toIso(addDays(today, WINDOW_DAYS - 1));

  const [dates, setDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timesOfDay, setTimesOfDay] = useState<TimeOfDay[]>([]);
  const [location, setLocation] = useState("");
  const [query, setQuery] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [methods, setMethods] = useState<FishingMethod[]>([]);
  const [areaSpecies, setAreaSpecies] = useState<FishSpecies[]>([]);
  const [interested, setInterested] = useState<string[]>([]);
  const [findingFish, setFindingFish] = useState(false);

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<FishingDayReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<SavedPlan[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setHistory(loadHistory()), []);

  // Location autocomplete (debounced).
  useEffect(() => {
    if (query.trim().length < 3 || query === selectedText) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) setSuggestions((await res.json()) as GeoSuggestion[]);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query, selectedText]);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function setPreset(kind: "today" | "tomorrow" | "weekend") {
    if (kind === "today") setDates([todayIso]);
    else if (kind === "tomorrow") setDates([toIso(addDays(today, 1))]);
    else {
      const out: string[] = [];
      for (let i = 0; i < WINDOW_DAYS; i++) {
        const d = addDays(today, i);
        if (d.getDay() === 6 || d.getDay() === 0) out.push(toIso(d));
        if (out.length === 2) break;
      }
      setDates(out);
    }
    setCalendarOpen(false);
  }

  function selectSuggestion(s: GeoSuggestion) {
    const clean = cleanLocation(s.text);
    setLocation(clean);
    setQuery(clean);
    setSelectedText(clean);
    setSuggestions([]);
    setAreaSpecies([]);
    setInterested([]);
  }

  async function findFish() {
    if (!location) return;
    setFindingFish(true);
    try {
      const res = await fetch(`/api/species?location=${encodeURIComponent(location)}`);
      if (res.ok) setAreaSpecies((await res.json()) as FishSpecies[]);
    } catch {
      /* ignore */
    } finally {
      setFindingFish(false);
    }
  }

  const canSubmit = dates.length > 0 && location.trim() !== "" && methods.length > 0;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, dates, timesOfDay, methods, interestedSpecies: interested }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as FishingDayReport[];
      if (data.length === 0) throw new Error("No valid dates within the next 14 days.");
      setReports(data);
      const plan: SavedPlan = {
        id: newPlanId(),
        savedAt: Date.now(),
        location,
        dates,
        reports: data,
      };
      setHistory(savePlan(plan));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setLoading(false);
  }

  function loadPlan(plan: SavedPlan) {
    setReports(plan.reports);
    setHistoryOpen(false);
  }
  function deletePlan(id: string) {
    setHistory(removePlan(id));
  }
  function reset() {
    setReports(null);
    setError(null);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl py-6">
        <LoadingSplash onCancel={cancel} />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-end gap-2">
        {reports && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand"
          >
            <CalendarDays className="h-3.5 w-3.5" /> Plan another day
          </button>
        )}
        <button
          type="button"
          onClick={() => setHistoryOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand"
        >
          <HistoryIcon className="h-3.5 w-3.5" /> History ({history.length})
        </button>
      </div>

      {reports ? (
        <ReportView reports={reports} />
      ) : (
        <div className="space-y-5 rounded-2xl border border-line bg-raised p-5 shadow-sm sm:p-6">
          {/* Dates */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink">
              When do you want to fish?
            </div>
            <div className="flex flex-wrap gap-2">
              <Pill active={false} onClick={() => setPreset("today")}>Today</Pill>
              <Pill active={false} onClick={() => setPreset("tomorrow")}>Tomorrow</Pill>
              <Pill active={false} onClick={() => setPreset("weekend")}>This weekend</Pill>
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 hover:border-brand hover:text-brand"
              >
                <CalendarDays className="h-4 w-4" /> Pick on calendar
              </button>
            </div>
            {calendarOpen && (
              <div className="mt-2 inline-block rounded-xl border border-line bg-surface p-2 shadow-lg">
                <DayPicker
                  mode="multiple"
                  captionLayout="dropdown"
                  selected={dates.map(isoToDate)}
                  onSelect={(days) => setDates((days ?? []).map(toIso))}
                  startMonth={today}
                  disabled={[{ before: today }, { after: addDays(today, WINDOW_DAYS - 1) }]}
                />
              </div>
            )}
            {dates.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...dates].sort().map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand"
                  >
                    {labelFor(d)}
                    <button type="button" onClick={() => setDates(dates.filter((x) => x !== d))} aria-label={`Remove ${labelFor(d)}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input type="hidden" data-max={maxIso} />
          </div>

          {/* Time of day */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Clock className="h-4 w-4 text-brand" /> Time of day
              <span className="font-normal text-ink-3">(optional — defaults to the best window)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIMES.map((t) => (
                <Pill key={t.key} active={timesOfDay.includes(t.key)} onClick={() => setTimesOfDay(toggle(timesOfDay, t.key))}>
                  {t.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="relative">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
              <MapPin className="h-4 w-4 text-brand" /> Location (city and state)
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 focus-within:border-brand">
              <Search className="h-4 w-4 text-ink-3" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLocation(e.target.value);
                }}
                placeholder="Start typing a city… e.g. Southport, NC"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              />
            </div>
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.magicKey}>
                    <button
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="block w-full px-3 py-2 text-left text-sm text-ink-2 hover:bg-brand-subtle hover:text-brand"
                    >
                      {s.text}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Methods */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink">
              How will you fish? <span className="font-normal text-ink-3">(select all that apply)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <Pill key={m.key} active={methods.includes(m.key)} onClick={() => setMethods(toggle(methods, m.key))}>
                  {m.label}
                </Pill>
              ))}
            </div>
          </div>

          {/* Species */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink">
              Species you&apos;re interested in <span className="font-normal text-ink-3">(optional)</span>
            </div>
            {areaSpecies.length === 0 ? (
              <button
                type="button"
                disabled={!location || findingFish}
                onClick={findFish}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <Fish className="h-4 w-4" /> {findingFish ? "Finding fish…" : "Find fish in this area"}
              </button>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {areaSpecies.map((s) => (
                  <Pill key={s.scientificName} active={interested.includes(s.commonName)} onClick={() => setInterested(toggle(interested, s.commonName))}>
                    <span className="capitalize">{s.commonName}</span>
                  </Pill>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            Plan my fishing day
          </button>
        </div>
      )}

      {/* History drawer */}
      {historyOpen && (
        <aside className="mt-4 rounded-2xl border border-line bg-raised p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold text-ink">
              <HistoryIcon className="h-4 w-4 text-brand" /> Recent plans
            </h3>
            <button type="button" onClick={() => setHistoryOpen(false)} aria-label="Close" className="text-ink-3 hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-ink-3">No saved plans yet.</p>
          ) : (
            <ul className="space-y-1">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => loadPlan(p)}
                    className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left hover:bg-brand-subtle"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      <MapPin className="h-3.5 w-3.5 text-brand" /> {p.location}
                    </span>
                    <span className="text-xs text-ink-3">
                      {labelFor([...p.dates].sort()[0] ?? toIso(today))}
                    </span>
                  </button>
                  <button type="button" onClick={() => deletePlan(p.id)} aria-label="Remove plan" className="text-ink-3 hover:text-error">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      )}
    </div>
  );
}
