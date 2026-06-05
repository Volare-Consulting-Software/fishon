import { Anchor, Construction, Fish, Ship, Waves } from "lucide-react";
import type { SpotKind } from "@volare-consulting/fishon";
import type { LucideIcon } from "lucide-react";

export const SPOT_CATEGORIES: Record<
  SpotKind,
  { color: string; icon: LucideIcon }
> = {
  // Shades of the Volare purple — categories differ by shade + icon, not hue.
  "Artificial Reef": { color: "#5e27d2", icon: Anchor },
  Pier: { color: "#7d4fdb", icon: Construction },
  Jetty: { color: "#4a1eb0", icon: Waves },
  "Fishing Spot": { color: "#9b78e6", icon: Fish },
  Wreck: { color: "#34147e", icon: Ship },
};
