// Shapes returned by the (partner-gated) Fish Rules API.

export interface FishRulesLocationEntry {
  fish_id: number;
  species: string;
  synonyms?: string[];
  bag_limit: number | null;
  prohibited?: number;
  location_name: string;
}

export interface FishRulesLocationResponse {
  success?: boolean;
  results?: FishRulesLocationEntry[];
}

export interface FishRulesSpeciesResult {
  location_name?: string;
  bag_limit?: number | null;
  min_size?: number | null;
  max_size?: number | null;
  measurement_unit?: string | null;
  prohibited?: number;
}

export interface FishRulesSpeciesResponse {
  success?: boolean;
  results?: FishRulesSpeciesResult[];
}
