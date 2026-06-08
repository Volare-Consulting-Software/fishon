import { describe, it, expect } from "vitest";
import { stripHtml, rateFishRulesEdibility } from "../src/services/edibility";

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<p>Very good,</p>  <p>but watch mercury.</p>")).toBe(
      "Very good, but watch mercury."
    );
  });

  it("decodes a few common entities", () => {
    expect(stripHtml("salt &amp; pepper")).toBe("salt & pepper");
  });

  it("returns empty string for nullish input", () => {
    expect(stripHtml(null)).toBe("");
    expect(stripHtml(undefined)).toBe("");
  });
});

describe("rateFishRulesEdibility", () => {
  it("rates strong praise as yum and keeps the note", () => {
    const v = rateFishRulesEdibility("Excellent table fare.");
    expect(v.edibility).toBe("yum");
    expect(v.edibilityNote).toBe("Excellent table fare.");
  });

  it("rates middling notes as meh", () => {
    expect(rateFishRulesEdibility("Good, quality varies.").edibility).toBe("meh");
  });

  it("rates warnings as yuck", () => {
    expect(rateFishRulesEdibility("Do not eat — high mercury.").edibility).toBe(
      "yuck"
    );
  });

  it("returns unknown for empty text", () => {
    expect(rateFishRulesEdibility("   ").edibility).toBe("unknown");
  });
});
