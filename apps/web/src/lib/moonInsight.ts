// Explain how the previous night's moon shifts the bite timing: a bright moon
// lets fish feed overnight, so they start later the next day — and vice versa.
export function moonInsight(illumination: number): string {
  if (illumination >= 70) {
    return "Bright moon last night — fish fed under the moonlight, so they often stay up later and the daytime bite starts later. You can usually start later.";
  }
  if (illumination <= 30) {
    return "Dark moon last night — little overnight feeding by moonlight, so fish are often hungry at first light. An early start tends to pay off.";
  }
  return "A partial moon last night — feeding was moderate overnight, so timing is flexible; play the tides and wind.";
}
