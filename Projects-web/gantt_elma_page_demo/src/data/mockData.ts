import { buildUniformDailyLc } from "@/lib/planning";
import { ColumnConfig, Engineer, PlanningTask } from "@/types/planning";

export const engineers: Engineer[] = [
  { id: "eng-1", name: "Александр Вызулин", shortName: "АВ", color: "#16a34a", capacity: 8 },
  { id: "eng-2", name: "Анастасия Маклеева", shortName: "АМ", color: "#0ea5e9", capacity: 8 },
  { id: "eng-3", name: "Андрей Пахомов", shortName: "АП", color: "#f59e0b", capacity: 8 },
  { id: "eng-4", name: "Виктория Деревнина", shortName: "ВД", color: "#8b5cf6", capacity: 8 },
  { id: "eng-5", name: "Дмитрий Казаченко", shortName: "ДК", color: "#ef4444", capacity: 8 },
  { id: "eng-6", name: "Максим Ханин", shortName: "МХ", color: "#14b8a6", capacity: 8 },
  { id: "eng-7", name: "Никита Ридель", shortName: "НР", color: "#6366f1", capacity: 8 },
  { id: "eng-8", name: "Сергей Довженко", shortName: "СД", color: "#84cc16", capacity: 8 },
  { id: "eng-9", name: "Сергей Кошкин", shortName: "СК", color: "#ec4899", capacity: 8 },
];

const products = ["PS", "SP", "Калькуляция", "Спецификация", "Разобраться с ТЗ", "Сопровождение проекта", "Корректировка ТЗ"];
const projectTypes = ["Р", "ПС 35/6", "РТП", "ППТ-2 КЦ1", "КЦ-1", "РУСН-31"];
const actionTypes = ["Расчет", "Проектирование", "Согласование", "Проверка схем", "Корректировка", "Авторский надзор"];
const customers = ['АО "ОЗММ"', "Стойленский ГОК", "НЛМК", "Экоагрофарминг", "МБГЖ", "сборочный цех", "Инженерро"];
const segments = ["Presale", "EPC", "Engineering", "Service", "Industry"];
const projects = [
  "Модернизация РП",
  "Проектирование ПС 35/6",
  "Калькуляция поставки",
  "Спецификация оборудования",
  "Замена ячейки",
  "Корректировка ТЗ",
  "Сопровождение проекта",
];

function seeded(index: number, length: number): number {
  return (index * 13 + 7) % length;
}

function lcByIndex(index: number): number {
  const variants = [2, 3, 5, 8, 12, 16];
  return variants[seeded(index, variants.length)];
}

export const dateRange = {
  start: "2025-10-01",
  end: "2025-11-30",
};

export const defaultColumns: ColumnConfig[] = [
  { key: "idPlan", label: "ID_Plan", width: 90, visible: true },
  { key: "productType", label: "Product_Type", width: 150, visible: true },
  { key: "projectType", label: "Project_Type", width: 120, visible: true },
  { key: "actionType", label: "Action_Type", width: 160, visible: true },
  { key: "refLc", label: "Ref_LC", width: 90, visible: true },
  { key: "currentLc", label: "Current_LC", width: 110, visible: true },
  { key: "projectId3S", label: "Project_ID_3S", width: 120, visible: false },
  { key: "seg", label: "Seg", width: 120, visible: true },
  { key: "customer", label: "Customer", width: 180, visible: true },
  { key: "projectName", label: "Project_Name", width: 180, visible: true },
  { key: "endDate", label: "EndDate", width: 110, visible: false },
  { key: "startDate", label: "StartDate", width: 110, visible: true },
  { key: "finalDate", label: "FinalDate", width: 110, visible: true },
  { key: "authorId", label: "Author", width: 120, visible: true },
  { key: "notes", label: "Notes", width: 220, visible: false },
];

export const initialTasks: PlanningTask[] = Array.from({ length: 20 }).map((_, i) => {
  const offset = i * 2;
  const startDay = 1 + (offset % 42);
  const month = startDay > 31 ? "11" : "10";
  const day = String(startDay > 31 ? startDay - 31 : startDay).padStart(2, "0");
  const startDate = `2025-${month}-${day}`;
  const duration = 3 + (i % 8);
  const finalDate = (() => {
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + duration);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();
  const refLc = lcByIndex(i);
  const currentLc = Number((refLc + (i % 3 === 0 ? 1.4 : i % 4 === 0 ? -0.8 : 0.6)).toFixed(1));
  return {
    id: `task-${i + 1}`,
    idPlan: String(1000 + i),
    productType: products[seeded(i, products.length)],
    projectType: projectTypes[seeded(i + 2, projectTypes.length)],
    actionType: actionTypes[seeded(i + 4, actionTypes.length)],
    refLc,
    currentLc,
    dailyLc: buildUniformDailyLc(startDate, finalDate, currentLc),
    projectId3S: `3S-${2025}${String(i + 10).padStart(3, "0")}`,
    seg: segments[seeded(i + 1, segments.length)],
    customer: customers[seeded(i + 2, customers.length)],
    projectName: projects[seeded(i + 3, projects.length)],
    endDate: finalDate,
    startDate,
    finalDate,
    authorId: engineers[i % engineers.length].id,
    notes: i % 3 === 0 ? "Критичная точка контроля" : "Плановая задача",
  };
});
