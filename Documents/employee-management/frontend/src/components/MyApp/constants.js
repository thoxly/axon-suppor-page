// Импортируем новые цвета из общего компонента
import { statusColors as newStatusColors } from '../common/StatusBadge';

// Для обратной совместимости оставляем старые названия, но используем новые цвета
export const statusColors = {
  assigned: newStatusColors.assigned,
  accepted: newStatusColors.accepted,
  'in-progress': newStatusColors["in-progress"],
  completed: newStatusColors.completed,
  done: newStatusColors.done,
  cancelled: newStatusColors.cancelled,
  needsRevision: newStatusColors.needsRevision,
  'not-assigned': newStatusColors["not-assigned"],
};

export const statusLabels = {
  assigned: 'Назначена',
  accepted: 'Принята',
  'in-progress': 'В работе',
  completed: 'Завершена',
  done: 'Выполнена',
  cancelled: 'Отменена',
  needsRevision: 'Требует доработки',
  'not-assigned': 'Свободная',
};

export const roleLabels = {
  admin: 'Администратор',
  manager: 'Менеджер',
  employee: 'Сотрудник',
};

export const BOTTOM_NAV_HEIGHT = 72; // height in pixels
export const BOTTOM_NAV_SPACING = BOTTOM_NAV_HEIGHT + 16; // additional spacing for comfort 