import { alpha } from '@mui/material/styles';
import { statusColors } from '../common/StatusBadge';

export const getStatusStyles = (status, theme) => {
  const colorConfig = statusColors[status] || statusColors["not-assigned"];
  
  return {
    bg: alpha(colorConfig.bg, 0.12),
    color: colorConfig.bg,
    border: alpha(colorConfig.bg, 0.24)
  };
}; 