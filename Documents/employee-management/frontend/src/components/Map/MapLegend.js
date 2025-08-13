import React from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';

const MapLegend = ({ routes = [] }) => {
  // Получаем уникальные типы маршрутов и их цвета
  const getLegendItems = () => {
    const items = [];
    
    // Массив цветов для задач
    const taskColors = [
      '#FF0000', // Красный
      '#00FF00', // Зеленый
      '#0000FF', // Синий
      '#FFA500', // Оранжевый
      '#800080', // Фиолетовый
      '#FFC0CB', // Розовый
      '#00FFFF', // Голубой
      '#FFFF00', // Желтый
      '#FF4500', // Оранжево-красный
      '#32CD32', // Лаймовый
      '#FF1493', // Глубокий розовый
      '#00CED1', // Темно-голубой
      '#FFD700', // Золотой
      '#FF69B4', // Горячий розовый
      '#20B2AA', // Светло-морской
    ];
    
    // Добавляем задачи с уникальными цветами
    const taskRoutes = routes.filter(route => route.route_type === 'task');
    const uniqueTasks = [];
    
    taskRoutes.forEach(route => {
      const taskId = route.task_id;
      if (!uniqueTasks.find(task => task.id === taskId)) {
        uniqueTasks.push({
          id: taskId,
          title: route.task_title,
          status: route.task_status,
          color: taskColors[uniqueTasks.length % taskColors.length]
        });
      }
    });
    
    uniqueTasks.forEach(task => {
      items.push({ 
        type: 'task', 
        id: task.id,
        title: task.title,
        status: task.status,
        color: task.color, 
        label: task.title || `Задача #${task.id}` 
      });
    });
    
    // Добавляем сессии без задач
    const hasSessionRoutes = routes.some(route => route.route_type === 'session');
    if (hasSessionRoutes) {
      items.push({ 
        type: 'session', 
        color: '#808080', // Серый для сессий без задач
        label: 'Без задачи' 
      });
    }
    
    return items;
  };

  const legendItems = getLegendItems();

  if (legendItems.length === 0) {
    return null;
  }

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
      <Typography variant="h6" sx={{ mb: 1 }}>
        Легенда карты
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {legendItems.map((item, index) => (
          <Box 
            key={index} 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              backgroundColor: 'background.default'
            }}
          >
            <Box 
              sx={{ 
                width: 20, 
                height: 4, 
                backgroundColor: item.color,
                borderRadius: 0.5
              }} 
            />
            <Typography variant="body2">
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};

export default MapLegend; 