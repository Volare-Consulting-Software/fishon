// Raw shapes returned by the public Fish Rules API (app.fishrulesapp.com).
//
// The site ships a static, public x-api-key/x-client-id in its JS bundle; the
// key is not enforced (the endpoints answer 200 without it) and is used only for
// soft rate-limiting, so we send the public defaults as a courtesy. Two stable
// JSON endpoints back this integration:
//   GET /api/regulations/location/{lat}/{lng}  -> FishRulesLocationResponse
//   GET /api/regulations/{regulationId}        -> FishRulesDetailResponse
// Species photos live at /images/fishimages/{fish_id}/{fish_id}.jpg.

/** One species' summary record for an area (the location list endpoint). */
export interface FishRulesLocationEntry {
  /** Regulation id — the key for the detail endpoint (NOT the species id). */
  id: number;
  /** Species id — the key for image URLs. */
  fish_id: number;
  species: string;
  synonyms?: string[];
  shape?: string;
  bag_limit: number | null;
  prohibited?: number;
  location_name: string;
  location_rank?: number;
  freshwater?: number;
  saltwater?: number;
}

export interface FishRulesLocationResponse {
  success?: boolean;
  results?: FishRulesLocationEntry[];
}

/** A nested PHP-style date as returned inside season windows. */
export interface FishRulesDate {
  /** e.g. "2026-04-01 00:00:00.000000" */
  date: string;
  timezone?: string;
}

/** An open-harvest window. `repeat` true means it recurs annually. */
export interface FishRulesSeason {
  starts_at?: FishRulesDate | null;
  ends_at?: FishRulesDate | null;
  description?: string;
  repeat?: boolean;
  exclusions?: unknown[];
}

/** Full single-regulation detail (the ~330-field record; useful subset typed). */
export interface FishRulesRegulationDetail {
  id: number;
  fish_id: number;
  species: string;
  shape?: string;
  synonyms?: string[];
  location_name?: string;
  bag_limit: number | null;
  vessel_limit?: number | null;
  min_size?: number | null;
  max_size?: number | null;
  min_slot_size?: number | null;
  max_slot_size?: number | null;
  measurement_name?: string | null;
  measurement_abbreviation?: string | null;
  measurement_unit?: string | null;
  measurement_unit_symbol?: string | null;
  prohibited?: number;
  /** 1 = no seasonal closures (open year-round when not prohibited). */
  no_closures?: number;
  no_limit_bag?: number;
  no_limit_min?: number;
  /** HTML edibility note, e.g. "<p>Very good, but may contain mercury.</p>". */
  edibility?: string | null;
  /** HTML general notes. */
  notes?: string | null;
  additional_licenses_required?: string | null;
  seasons?: FishRulesSeason[];
}

export interface FishRulesDetailResponse {
  success?: boolean;
  results?: FishRulesRegulationDetail;
}
