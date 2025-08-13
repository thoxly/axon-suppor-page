import React from 'react';
import { Chip, Box } from '@mui/material';

// Единые цвета для всех статусов задач
export const statusColors = {
  "not-assigned": { bg: "#B0BEC5", text: "#fff" }, // серый
  assigned: { bg: "#42A5F5", text: "#fff" },       // синий
  accepted: { bg: "#66BB6A", text: "#fff" },       // зелёный
  "in-progress": { bg: "#FFA726", text: "#fff" },  // оранжевый
  completed: { bg: "#26C6DA", text: "#fff" },      // бирюзовый
  overdue: { bg: "#EF5350", text: "#fff" },        // красный
  needsRevision: { bg: "#AB47BC", text: "#fff" },  // фиолетовый
  done: { bg: "#8BC34A", text: "#fff" },           // светло-зелёный
  cancelled: { bg: "#9E9E9E", text: "#fff" },      // тёмно-серый
};

// Единые лейблы для всех статусов
export const statusLabels = {
  "not-assigned": 'Не назначена',
  assigned: 'Назначена',
  accepted: 'Принята',
  "in-progress": 'В работе',
  completed: 'Завершена',
  overdue: 'Просрочена',
  needsRevision: 'Требует доработки',
  done: 'Выполнена',
  cancelled: 'Отменена',
};

const StatusBadge = ({ 
  status, 
  size = "small", 
  variant = "filled",
  sx = {},
  showLabel = true 
}) => {
  const colorConfig = statusColors[status] || statusColors["not-assigned"];
  const label = showLabel ? (statusLabels[status] || 'Неизвестно') : '';

  return (
    <Chip
      label={label}
      size={size}
      variant={variant}
      sx={{
        backgroundColor: colorConfig.bg,
        color: colorConfig.text,
        fontWeight: 600,
        borderRadius: '12px',
        height: size === 'small' ? '28px' : '32px',
        border: `1px solid ${colorConfig.bg}`,
        '& .MuiChip-label': {
          px: 1.5,
          fontSize: size === 'small' ? '0.75rem' : '0.875rem',
          fontWeight: 600,
        },
        ...sx
      }}
    />
  );
};

export default StatusBadge; 