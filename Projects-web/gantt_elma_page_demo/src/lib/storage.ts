import { ColumnConfig, PlannerSnapshot, PlanningTask, TimelineScale } from "@/types/planning";

const STORAGE_KEY = "elma-gantt-demo-v1";

interface PersistedState {
  tasks: PlanningTask[];
  columns: ColumnConfig[];
  scale: TimelineScale;
}

export function loadPlannerState(): PersistedState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function savePlannerState(snapshot: PlannerSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota/runtime errors in demo mode.
  }
}

export function clearPlannerState(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
