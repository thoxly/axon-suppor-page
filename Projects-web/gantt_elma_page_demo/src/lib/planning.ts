import { addDays, clamp, diffDays, eachDay } from "@/lib/date";
import {
  DateCell,
  DailyLoad,
  Engineer,
  EngineerLoadMap,
  PlanningTask,
} from "@/types/planning";

export const round1 = (value: number): number => Math.round(value * 10) / 10;

export function buildUniformDailyLc(
  startDate: string,
  finalDate: string,
  currentLc: number
): DailyLoad[] {
  const days = eachDay(startDate, finalDate);
  if (days.length === 0) {
    return [];
  }
  const base = round1(currentLc / days.length);
  const values = days.map((date) => ({ date, value: base }));
  const sum = round1(values.reduce((acc, item) => acc + item.value, 0));
  const delta = round1(currentLc - sum);
  if (values.length > 0 && delta !== 0) {
    values[values.length - 1].value = round1(values[values.length - 1].value + delta);
  }
  return values;
}

export function normalizeTask(task: PlanningTask): PlanningTask {
  const safeCurrent = round1(task.currentLc > 0 ? task.currentLc : task.refLc);
  const range = eachDay(task.startDate, task.finalDate);
  const map = new Map(task.dailyLc.map((item) => [item.date, item.value]));
  const normalized = range.map((date) => ({
    date,
    value: round1(map.get(date) ?? 0),
  }));
  const sum = round1(normalized.reduce((acc, item) => acc + item.value, 0));
  if (sum <= 0 && normalized.length > 0) {
    return { ...task, currentLc: safeCurrent, dailyLc: buildUniformDailyLc(task.startDate, task.finalDate, safeCurrent) };
  }
  return { ...task, currentLc: sum, dailyLc: normalized };
}

export function shiftTask(task: PlanningTask, deltaDays: number): PlanningTask {
  const nextStart = addDays(task.startDate, deltaDays);
  const nextFinal = addDays(task.finalDate, deltaDays);
  const shiftedDaily = task.dailyLc.map((item) => ({
    date: addDays(item.date, deltaDays),
    value: item.value,
  }));
  return normalizeTask({
    ...task,
    startDate: nextStart,
    finalDate: nextFinal,
    endDate: nextFinal,
    dailyLc: shiftedDaily,
  });
}

export function resizeTask(
  task: PlanningTask,
  side: "start" | "end",
  deltaDays: number
): PlanningTask {
  const duration = diffDays(task.startDate, task.finalDate) + 1;
  if (duration <= 1 && ((side === "start" && deltaDays > 0) || (side === "end" && deltaDays < 0))) {
    return task;
  }
  const nextStart =
    side === "start" ? addDays(task.startDate, deltaDays) : task.startDate;
  const nextFinal =
    side === "end" ? addDays(task.finalDate, deltaDays) : task.finalDate;
  if (diffDays(nextStart, nextFinal) < 0) {
    return task;
  }
  return normalizeTask({
    ...task,
    startDate: nextStart,
    finalDate: nextFinal,
    endDate: nextFinal,
    dailyLc: buildUniformDailyLc(nextStart, nextFinal, task.currentLc),
  });
}

export function updateTaskDailyValue(
  task: PlanningTask,
  date: string,
  value: number
): PlanningTask {
  const nextValue = round1(clamp(value, 0, 24));
  const range = eachDay(task.startDate, task.finalDate);
  const map = new Map(task.dailyLc.map((item) => [item.date, item.value]));
  map.set(date, nextValue);
  const dailyLc = range.map((itemDate) => ({
    date: itemDate,
    value: round1(map.get(itemDate) ?? 0),
  }));
  const currentLc = round1(dailyLc.reduce((sum, item) => sum + item.value, 0));
  return {
    ...task,
    dailyLc,
    currentLc,
  };
}

export function buildEngineerLoadMap(
  tasks: PlanningTask[],
  dateCells: DateCell[]
): EngineerLoadMap {
  const map: EngineerLoadMap = {};
  for (const task of tasks) {
    if (!map[task.authorId]) {
      map[task.authorId] = {};
    }
    for (const day of task.dailyLc) {
      if (!dateCells.find((c) => c.date === day.date)) {
        continue;
      }
      map[task.authorId][day.date] = round1(
        (map[task.authorId][day.date] ?? 0) + day.value
      );
    }
  }
  return map;
}

export function loadCardsByEngineer(
  tasks: PlanningTask[],
  dateCells: DateCell[]
): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  for (const task of tasks) {
    if (!map[task.authorId]) {
      map[task.authorId] = {};
    }
    for (const date of eachDay(task.startDate, task.finalDate)) {
      if (!dateCells.find((c) => c.date === date)) {
        continue;
      }
      map[task.authorId][date] = (map[task.authorId][date] ?? 0) + 1;
    }
  }
  return map;
}

export function getEngineerById(engineers: Engineer[], id: string): Engineer | undefined {
  return engineers.find((engineer) => engineer.id === id);
}
