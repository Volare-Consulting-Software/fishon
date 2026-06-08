import { EdibilityRating } from "../types/speciesProfile";

export interface EdibilityVerdict {
  edibility: EdibilityRating;
  edibilityNote?: string;
}

/** Strip HTML tags/entities to plain text and collapse whitespace. */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Fish Rules edibility notes tend to lead with a quality word
// ("Excellent", "Very good", "Good", "Fair", "Poor", "Not recommended").
const YUCK = ["do not eat", "not recommended", "inedible", "poisonous", "toxic", "not eaten", "ciguatera"];
const YUM = ["excellent", "very good", "highly", "prized", "delicious"];
const MEH = ["good", "fair", "edible", "decent", "moderate", "fine"];

/** Rate an already-plain-text Fish Rules edibility note. */
export function rateFishRulesEdibility(text: string): EdibilityVerdict {
  const note = text.trim();
  if (!note) return { edibility: "unknown" };
  const t = note.toLowerCase();

  if (YUCK.some((k) => t.includes(k))) return { edibility: "yuck", edibilityNote: note };
  if (YUM.some((k) => t.includes(k))) return { edibility: "yum", edibilityNote: note };
  if (MEH.some((k) => t.includes(k))) return { edibility: "meh", edibilityNote: note };
  return { edibility: "unknown", edibilityNote: note };
}
