export type ViewMode = "hours" | "cards";
export type TimelineScale = "day" | "week" | "month";

export interface DailyLoad {
  date: string;
  value: number;
}

export interface Engineer {
  id: string;
  name: string;
  shortName: string;
  color: string;
  capacity: number;
}

export interface PlanningTask {
  id: string;
  idPlan: string;
  productType: string;
  projectType: string;
  actionType: string;
  refLc: number;
  currentLc: number;
  dailyLc: DailyLoad[];
  projectId3S: string;
  seg: string;
  customer: string;
  projectName: string;
  endDate: string;
  startDate: string;
  finalDate: string;
  authorId: string;
  notes: string;
}

export interface ColumnConfig {
  key: keyof PlanningTask;
  label: string;
  width: number;
  visible: boolean;
}

export interface DateCell {
  date: string;
  day: number;
  monthKey: string;
  monthLabel: string;
  isWeekend: boolean;
  isToday: boolean;
}

export interface PlannerSnapshot {
  tasks: PlanningTask[];
  columns: ColumnConfig[];
  scale: TimelineScale;
}

export type EngineerLoadMap = Record<string, Record<string, number>>;
