import Anthropic from "@anthropic-ai/sdk";
import type {
  ForecastRow,
  TidePrediction,
  FishingSpot,
  FishSpecies,
  GeoLocation,
  MoonPhase,
} from "@volare-consulting/fishon";
import { FishingMethod } from "@/types/fishingTripRequest";
import { TimeOfDay } from "@/types/timeOfDay";
import { DaySuggestion } from "@/types/daySuggestion";
import { scoreConditions } from "@/lib/conditionScore";
import { moonInsight } from "@/lib/moonInsight";

export interface SuggestionInput {
  date: string;
  location: GeoLocation;
  marineForecastAvailable: boolean;
  periods: ForecastRow[];
  tides: TidePrediction[];
  moonPhase: MoonPhase | "";
  moonIllumination: number;
  reefs: FishingSpot[];
  species: FishSpecies[];
  methods: FishingMethod[];
  timesOfDay: TimeOfDay[];
  interestedSpecies: string[];
}

const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You are a careful fishing-trip planner. You are given REAL data for one day at one location: marine conditions (wind, gust, wave height by AM/PM), tides, the previous night's moon, nearby fishing spots/structures, and fish species actually recorded in the area.

Rules you MUST follow:
- Use ONLY the species names in the provided list and ONLY the spot names provided. NEVER invent a species or a spot.
- Choose recommendedMethod ONLY from the user's selected methods.
- Respect the requested time-of-day windows when given.
- If data is insufficient (no spots, unsafe conditions, missing marine forecast), say so in cautions and lower confidence. Do not pretend.
- Moon guidance: a bright moon the previous night means fish fed overnight and the daytime bite often starts later; a dark moon means an early start is usually better.
- Wind guidance: "west is best, least is the east" — westerly winds favor the bite, easterly winds slow it, but a light east wind on a calm day is fine.
- Keep rationale to 1-3 plain sentences an angler would appreciate.`;

const SUGGESTION_TOOL: Anthropic.Tool = {
  name: "emit_suggestion",
  description: "Emit the grounded fishing-day suggestion.",
  input_schema: {
    type: "object",
    properties: {
      bestWindow: { type: "string", enum: ["morning", "midday", "evening", "fullday"] },
      recommendedMethod: { type: "string", enum: ["shoreline", "nearshore", "offshore"] },
      targetSpecies: { type: "array", items: { type: "string" } },
      recommendedSpots: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      rationale: { type: "string" },
      cautions: { type: "array", items: { type: "string" } },
    },
    required: [
      "bestWindow",
      "recommendedMethod",
      "targetSpecies",
      "recommendedSpots",
      "confidence",
      "rationale",
      "cautions",
    ],
  },
};

export class SuggestionService {
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
  }

  async suggest(input: SuggestionInput): Promise<DaySuggestion> {
    const fallback = this.deterministic(input);
    if (!this.client) return fallback;
    try {
      const ai = await this.askClaude(input);
      return ai ?? fallback;
    } catch {
      return fallback;
    }
  }

  private async askClaude(
    input: SuggestionInput
  ): Promise<DaySuggestion | null> {
    if (!this.client) return null;
    const payload = {
      date: input.date,
      location: `${input.location.name}, ${input.location.state}`,
      marineForecastAvailable: input.marineForecastAvailable,
      periods: input.periods.map((p) => ({
        period: p.period,
        windSpeed: p.windSpeed,
        windFrom: p.windDirCompass,
        gust: p.gust,
        waveHeightFt: p.waveHeight,
        tempF: p.tempF,
        rainPct: p.precipPct,
      })),
      tides: input.tides.map((t) => ({ type: t.type, time: t.time, ft: t.height })),
      moon: { phase: input.moonPhase, illuminationPct: input.moonIllumination },
      selectedMethods: input.methods,
      requestedWindows: input.timesOfDay,
      nearbySpots: input.reefs.slice(0, 12).map((r) => r.name),
      localSpecies: input.species.slice(0, 20).map((s) => s.commonName),
      interestedSpecies: input.interestedSpecies,
    };

    const res = await this.client.messages.create({
      model: MODEL,
      max_tokens: 700,
      temperature: 0,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [SUGGESTION_TOOL],
      tool_choice: { type: "tool", name: "emit_suggestion" },
      messages: [
        { role: "user", content: `Plan this day:\n${JSON.stringify(payload, null, 2)}` },
      ],
    });

    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    return this.sanitize(block.input as DaySuggestion, input);
  }

  // Guard the model's output against the data, in case it strays.
  private sanitize(s: DaySuggestion, input: SuggestionInput): DaySuggestion {
    const speciesSet = new Set(input.species.map((x) => x.commonName.toLowerCase()));
    const spotSet = new Set(input.reefs.map((x) => x.name.toLowerCase()));
    const method = input.methods.includes(s.recommendedMethod)
      ? s.recommendedMethod
      : (input.methods[0] ?? "shoreline");
    return {
      ...s,
      recommendedMethod: method,
      targetSpecies: (s.targetSpecies ?? []).filter((n) =>
        speciesSet.has(n.toLowerCase())
      ),
      recommendedSpots: (s.recommendedSpots ?? []).filter((n) =>
        spotSet.has(n.toLowerCase())
      ),
      cautions: s.cautions ?? [],
    };
  }

  // Deterministic conditions-based suggestion (also the no-AI-key default).
  private deterministic(input: SuggestionInput): DaySuggestion {
    const periods = input.periods.length > 0 ? input.periods : [];
    const methods = input.methods.length > 0 ? input.methods : (["shoreline"] as FishingMethod[]);

    let best: { method: FishingMethod; row: ForecastRow; score: number; cautions: string[] } | null = null;
    const allCautions = new Set<string>();
    for (const method of methods) {
      for (const row of periods) {
        const { score, cautions } = scoreConditions(row, method);
        cautions.forEach((c) => allCautions.add(c));
        // Moon nudge: bright moon favors PM, dark moon favors AM.
        const nudge =
          input.moonIllumination >= 70 && row.period === "PM"
            ? 6
            : input.moonIllumination <= 30 && row.period === "AM"
              ? 6
              : 0;
        const total = score + nudge;
        if (!best || total > best.score) best = { method, row, score: total, cautions };
      }
    }

    const bestWindow: DaySuggestion["bestWindow"] = !best
      ? "fullday"
      : input.timesOfDay.includes("fullday")
        ? "fullday"
        : best.row.period === "PM"
          ? "evening"
          : "morning";

    const targetSpecies = this.pickSpecies(input);
    const recommendedSpots = input.reefs.slice(0, 3).map((r) => r.name);

    const cautions: string[] = [...allCautions];
    if (!input.marineForecastAvailable) {
      cautions.push(
        "Detailed wind & wave forecast isn't published this far out yet — based on tides, moon, spots, and species."
      );
    }
    if (input.reefs.length === 0) {
      cautions.push("No nearby reefs/structures found, so spot guidance is limited.");
    }

    const score = best?.score ?? 0;
    const confidence: DaySuggestion["confidence"] =
      !input.marineForecastAvailable || input.reefs.length === 0
        ? "low"
        : score >= 78
          ? "high"
          : score >= 55
            ? "medium"
            : "low";

    return {
      bestWindow,
      recommendedMethod: best?.method ?? methods[0] ?? "shoreline",
      targetSpecies,
      recommendedSpots,
      confidence,
      rationale: this.rationale(input, best, bestWindow),
      cautions,
    };
  }

  private pickSpecies(input: SuggestionInput): string[] {
    const known = new Set(input.species.map((s) => s.commonName.toLowerCase()));
    const interested = input.interestedSpecies.filter((n) => known.has(n.toLowerCase()));
    if (interested.length > 0) return interested.slice(0, 3);
    return input.species.slice(0, 3).map((s) => s.commonName);
  }

  private rationale(
    input: SuggestionInput,
    best: { method: FishingMethod; row: ForecastRow } | null,
    window: DaySuggestion["bestWindow"]
  ): string {
    const parts: string[] = [];
    if (best) {
      const w = window === "evening" ? "Afternoon/evening" : window === "morning" ? "Morning" : "The day";
      const seas = best.row.waveHeight <= 2 ? `calm ${best.row.waveHeight} ft seas` : `${best.row.waveHeight} ft seas`;
      parts.push(`${w} looks best for ${best.method}: ${seas}, wind ${best.row.windSpeed} mph from ${best.row.windDirCompass}.`);
    }
    if (input.moonPhase) parts.push(moonInsight(input.moonIllumination));
    return parts.join(" ") || "Conditions are workable — play the tides and wind.";
  }
}
