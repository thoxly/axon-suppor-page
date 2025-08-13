import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import {
  CenterFocusStrong as CenterIcon,
  ZoomIn as ZoomIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { calculateRouteBounds, calculateRouteCenter, calculateOptimalZoom } from '../../utils/mapUtils';

const MapInfo = ({ routes = [], center, zoom }) => {
  if (!routes || routes.length === 0) {
    return null;
  }

  const bounds = calculateRouteBounds(routes);
  const calculatedCenter = calculateRouteCenter(routes);
  const calculatedZoom = calculateOptimalZoom(routes);

  if (!bounds) {
    return null;
  }

  const formatCoordinate = (coord) => {
    return coord.toFixed(6);
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    } else {
      return `${(meters / 1000).toFixed(1)} км`;
    }
  };

  // Рассчитываем примерные размеры области
  const latDiff = bounds.maxLat - bounds.minLat;
  const lonDiff = bounds.maxLon - bounds.minLon;
  const maxDiff = Math.max(latDiff, lonDiff);

  // Примерное расстояние в метрах (очень приблизительно)
  const approximateDistance = maxDiff * 111000; // 1 градус ≈ 111 км

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 2, 
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: 'divider'
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        Информация о карте
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Центр карты */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CenterIcon color="primary" />
          <Typography variant="body2">
            <strong>Центр карты:</strong> {formatCoordinate(calculatedCenter[0])}, {formatCoordinate(calculatedCenter[1])}
          </Typography>
        </Box>

        {/* Зум */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ZoomIcon color="secondary" />
          <Typography variant="body2">
            <strong>Масштаб:</strong> {calculatedZoom}x
          </Typography>
        </Box>

        {/* Границы области */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="info" />
          <Typography variant="body2">
            <strong>Область:</strong> {formatDistance(approximateDistance)}
          </Typography>
        </Box>

        {/* Детали границ */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Границы:</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`С: ${formatCoordinate(bounds.minLat)}, ${formatCoordinate(bounds.minLon)}`} 
              size="small" 
              variant="outlined"
            />
            <Chip 
              label={`По: ${formatCoordinate(bounds.maxLat)}, ${formatCoordinate(bounds.maxLon)}`} 
              size="small" 
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Статистика маршрутов */}
        <Box>
          <Typography variant="body2" color="text.secondary">
            <strong>Маршруты:</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Chip 
              label={`Всего: ${routes.length}`} 
              size="small" 
              color="primary"
            />
            <Chip 
              label={`Задачи: ${routes.filter(r => r.route_type === 'task').length}`} 
              size="small" 
              color="secondary"
            />
            <Chip 
              label={`Без задачи: ${routes.filter(r => r.route_type === 'session').length}`} 
              size="small" 
              color="info"
            />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default MapInfo; 