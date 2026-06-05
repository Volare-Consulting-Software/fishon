import { Anchor, Construction, Fish, Ship, Waves } from "lucide-react";
import type { SpotKind } from "@volare-consulting/fishon";
import type { LucideIcon } from "lucide-react";

export const SPOT_CATEGORIES: Record<
  SpotKind,
  { color: string; icon: LucideIcon }
> = {
  "Artificial Reef": { color: "#5e27d2", icon: Anchor },
  Pier: { color: "#1e6fb8", icon: Construction },
  Jetty: { color: "#1f9d55", icon: Waves },
  "Fishing Spot": { color: "#c77700", icon: Fish },
  Wreck: { color: "#d93030", icon: Ship },
};
