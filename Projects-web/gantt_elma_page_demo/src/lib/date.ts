import { DateCell } from "@/types/planning";

export const DAY_MS = 24 * 60 * 60 * 1000;

export function parseISODate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseISODate(dateStr);
  date.setDate(date.getDate() + days);
  return formatISODate(date);
}

export function diffDays(from: string, to: string): number {
  const a = parseISODate(from).getTime();
  const b = parseISODate(to).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function eachDay(start: string, end: string): string[] {
  const result: string[] = [];
  const startDate = parseISODate(start);
  const endDate = parseISODate(end);
  for (
    let t = startDate.getTime();
    t <= endDate.getTime();
    t += DAY_MS
  ) {
    result.push(formatISODate(new Date(t)));
  }
  return result;
}

export function buildDateCells(start: string, end: string): DateCell[] {
  const today = formatISODate(new Date());
  return eachDay(start, end).map((date) => {
    const parsed = parseISODate(date);
    const day = parsed.getDay();
    const month = parsed.toLocaleDateString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    return {
      date,
      day: parsed.getDate(),
      monthKey: `${parsed.getFullYear()}-${parsed.getMonth()}`,
      monthLabel: month,
      isWeekend: day === 0 || day === 6,
      isToday: date === today,
    };
  });
}

export function clamp<T extends number>(value: T, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function monthCaption(date: string): string {
  return parseISODate(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
  });
}
