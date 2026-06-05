import { Sparkles, AlertTriangle } from "lucide-react";
import { DaySuggestion } from "@/types/daySuggestion";

const CONFIDENCE: Record<DaySuggestion["confidence"], string> = {
  high: "border-success/40 bg-success/10 text-success",
  medium: "border-warning/40 bg-warning/10 text-warning",
  low: "border-line bg-sunken text-ink-3",
};

const WINDOW_LABEL: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  fullday: "Full day",
};

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-3">{label}</div>
      <div className="text-sm font-semibold capitalize text-ink">{value || "—"}</div>
    </div>
  );
}

interface SuggestionPanelProps {
  suggestion: DaySuggestion;
}

export function SuggestionPanel({ suggestion }: SuggestionPanelProps) {
  return (
    <div className="rounded-xl border border-line bg-raised p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-brand" /> Suggested plan
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${CONFIDENCE[suggestion.confidence]}`}
        >
          {suggestion.confidence} confidence
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Best window" value={WINDOW_LABEL[suggestion.bestWindow] ?? suggestion.bestWindow} />
        <Field label="Method" value={suggestion.recommendedMethod} />
        <Field label="Target species" value={suggestion.targetSpecies.join(", ")} />
        <Field label="Spots" value={suggestion.recommendedSpots.join(", ")} />
      </div>

      <p className="mt-3 text-sm text-ink-2">{suggestion.rationale}</p>

      {suggestion.cautions.length > 0 && (
        <ul className="mt-3 space-y-1">
          {suggestion.cautions.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
