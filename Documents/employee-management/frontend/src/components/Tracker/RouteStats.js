import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { calculateDistance } from '../../utils/mapUtils';

const RouteStats = ({ routes = [] }) => {
  if (routes.length === 0) {
    return null;
  }

  // Рассчитываем статистику
  const calculateStats = () => {
    const taskRoutes = routes.filter(route => route.route_type === 'task');
    const sessionRoutes = routes.filter(route => route.route_type === 'session');
    
    const totalPositions = routes.reduce((sum, route) => sum + route.positions.length, 0);
    const totalTime = routes.reduce((sum, route) => {
      const start = new Date(route.session_start);
      const end = new Date(route.session_end || route.session_start);
      return sum + (end - start);
    }, 0);

    // Рассчитываем примерное расстояние (в метрах)
    const calculateTotalDistance = () => {
      let totalDistance = 0;
      
      routes.forEach(route => {
        const positions = route.positions;
        for (let i = 1; i < positions.length; i++) {
          const prev = positions[i - 1];
          const curr = positions[i];
          
          totalDistance += calculateDistance(
            prev.latitude, 
            prev.longitude, 
            curr.latitude, 
            curr.longitude
          );
        }
      });
      
      return totalDistance;
    };

    const totalDistance = calculateTotalDistance();

    // Статистика по статусам задач
    const taskStatusStats = {};
    taskRoutes.forEach(route => {
      const status = route.task_status || 'unknown';
      taskStatusStats[status] = (taskStatusStats[status] || 0) + 1;
    });

    return {
      totalRoutes: routes.length,
      taskRoutes: taskRoutes.length,
      sessionRoutes: sessionRoutes.length, // Маршруты без задачи
      totalPositions,
      totalTime,
      totalDistance,
      taskStatusStats,
      averagePositionsPerRoute: totalPositions / routes.length,
      averageTimePerRoute: totalTime / routes.length,
      averageDistancePerRoute: totalDistance / routes.length
    };
  };

  const stats = calculateStats();

  // Форматирование времени
  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}м`;
  };

  // Форматирование расстояния
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} м`;
    } else {
      return `${(meters / 1000).toFixed(1)} км`;
    }
  };

  // Получение цвета статуса задачи
  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'pending':
        return 'info';
      default:
        return 'default';
    }
  };

  // Получение русского названия статуса
  const getTaskStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'Выполняется';
      case 'pending':
        return 'Ожидает';
      default:
        return status;
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Статистика маршрутов
      </Typography>
      
      <Grid container spacing={3}>
        {/* Основные показатели */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon color="primary" />
              <Typography variant="body1">
                <strong>Всего маршрутов:</strong> {stats.totalRoutes}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon color="secondary" />
              <Typography variant="body1">
                <strong>Всего точек:</strong> {stats.totalPositions}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScheduleIcon color="info" />
              <Typography variant="body1">
                <strong>Общее время:</strong> {formatDuration(stats.totalTime)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SpeedIcon color="warning" />
              <Typography variant="body1">
                <strong>Общее расстояние:</strong> {formatDistance(stats.totalDistance)}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Детальная статистика */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Распределение по типам:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Задачи: ${stats.taskRoutes}`} 
                  color="primary" 
                  size="small"
                />
                <Chip 
                  label={`Без задачи: ${stats.sessionRoutes}`} 
                  color="secondary" 
                  size="small"
                />
              </Box>
            </Box>

            {stats.taskRoutes > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Статусы задач:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(stats.taskStatusStats).map(([status, count]) => (
                    <Chip 
                      key={status}
                      label={`${getTaskStatusLabel(status)}: ${count}`} 
                      color={getTaskStatusColor(status)}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Средние показатели:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box>
                  <Typography variant="body2">
                    Точек на маршрут: {stats.averagePositionsPerRoute.toFixed(1)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((stats.averagePositionsPerRoute / 50) * 100, 100)} 
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2">
                    Время на маршрут: {formatDuration(stats.averageTimePerRoute)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((stats.averageTimePerRoute / (2 * 60 * 60 * 1000)) * 100, 100)} 
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2">
                    Расстояние на маршрут: {formatDistance(stats.averageDistancePerRoute)}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((stats.averageDistancePerRoute / 5000) * 100, 100)} 
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RouteStats; 