import { FishingDayReport } from "@/types/fishingDayReport";

const KEY = "fishweather.history.v1";
const MAX = 10;

export interface SavedPlan {
  id: string;
  savedAt: number;
  location: string;
  dates: string[];
  reports: FishingDayReport[];
}

export function loadHistory(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedPlan[]) : [];
  } catch {
    return [];
  }
}

export function savePlan(plan: SavedPlan): SavedPlan[] {
  const list = [plan, ...loadHistory().filter((p) => p.id !== plan.id)].slice(
    0,
    MAX
  );
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
  return list;
}

export function removePlan(id: string): SavedPlan[] {
  const list = loadHistory().filter((p) => p.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* non-fatal */
  }
  return list;
}

export function newPlanId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
