import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TextField,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { differenceInDays, startOfDay, endOfDay, format } from 'date-fns';
import YandexMap from '../Map/YandexMap';
import MapLegend from '../Map/MapLegend';
import MapInfo from '../Map/MapInfo';
import RouteStats from './RouteStats';
import { calculateRouteCenter, calculateOptimalZoom } from '../../utils/mapUtils';
import { api } from '../../utils/api';

const PeriodTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noDataAlert, setNoDataAlert] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.employees.getAll();
      const activeEmployees = response.employees.filter(emp => emp.status === 'active');
      setEmployees(activeEmployees);
    } catch (err) {
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const validateDateRange = () => {
    if (!startDate || !endDate) return false;
    
    const daysDiff = differenceInDays(endDate, startDate);
    return daysDiff >= 0 && daysDiff <= 7;
  };

  const handleEmployeeChange = (event) => {
    setSelectedEmployee(event.target.value);
    // Reset routes when employee changes
    setRoutes([]);
  };

  const handleDateChange = (newStartDate, newEndDate) => {
    // Если передана начальная дата, обновляем её
    if (newStartDate !== undefined) {
      setStartDate(startOfDay(newStartDate));
    }
    // Если передана конечная дата, обновляем её
    if (newEndDate !== undefined) {
      setEndDate(endOfDay(newEndDate));
    }

    setError(null);

    const start = newStartDate || startDate;
    const end = newEndDate || endDate;

    if (start && end) {
      const daysDiff = differenceInDays(end, start);
      if (daysDiff > 7) {
        setError('Период не может быть больше 7 дней');
      } else if (daysDiff < 0) {
        setError('Дата начала должна быть раньше даты окончания');
      }
    }
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      // Используем новый API обработки координат вместо старого
      console.log('🔍 Fetching processed coordinates for period:', {
        userId: selectedEmployee,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await api.coordinateProcessing.getSessionsProcessedCoordinatesForPeriod(
        parseInt(selectedEmployee),
        startDate,
        endDate
      );
      
      console.log('🔍 Processed coordinates response:', response);
      console.log('🔍 Coordinates count:', response.coordinates?.length);
      
      if (!response.coordinates || response.coordinates.length === 0) {
        setNoDataAlert(`Нет данных о перемещениях сотрудника за выбранный период ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
        setRoutes([]);
        return;
      }
      
      // Создаем маршрут из обработанных координат
      const processedRoute = {
        route_type: 'period',
        session_id: null,
        session_start: response.coordinates[0]?.timestamp,
        session_end: response.coordinates[response.coordinates.length - 1]?.timestamp,
        positions: response.coordinates.map(coord => ({
          latitude: coord.latitude,
          longitude: coord.longitude,
          timestamp: coord.timestamp,
          originalCount: coord.originalCount || 1
        })),
        processingStats: {
          totalOriginalPositions: response.coordinates.reduce((sum, coord) => sum + (coord.originalCount || 1), 0),
          totalProcessedPositions: response.coordinates.length,
          reductionPercent: response.coordinates.length > 0 ? 
            ((response.coordinates.reduce((sum, coord) => sum + (coord.originalCount || 1), 0) - response.coordinates.length) / 
             response.coordinates.reduce((sum, coord) => sum + (coord.originalCount || 1), 0) * 100).toFixed(1) : 0
        }
      };
      
      console.log('🔍 Processed route:', processedRoute);
      setRoutes([processedRoute]);
    } catch (err) {
      console.error('Error fetching processed coordinates:', err);
      setError('Не удалось загрузить обработанные маршруты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployee && validateDateRange() && startDate && endDate) {
      fetchRoutes();
    }
  }, [selectedEmployee, startDate, endDate]);

  // Calculate map center based on all route points
  const getMapCenter = () => {
    return calculateRouteCenter(routes);
  };

  // Calculate optimal zoom for routes
  const getMapZoom = () => {
    return calculateOptimalZoom(routes, 9);
  };

  // Получаем статистику по маршрутам
  const getRouteStats = () => {
    if (routes.length === 0) {
      return {
        totalRoutes: 0,
        totalPositions: 0,
        totalDistance: 0,
        totalTime: 0,
        processingStats: null
      };
    }

    const route = routes[0]; // У нас только один обработанный маршрут
    const processingStats = route.processingStats;
    
    return {
      totalRoutes: routes.length,
      totalPositions: route.positions.length,
      totalDistance: 0, // Будет вычислено позже если нужно
      totalTime: route.session_start && route.session_end 
        ? new Date(route.session_end) - new Date(route.session_start)
        : 0,
      processingStats: processingStats
    };
  };

  const stats = getRouteStats();

  // Функция для получения цвета статуса задачи
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

  // Функция для получения русского названия статуса
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

  // Функция для форматирования длительности в человеко-читаемом формате
  const formatDuration = (milliseconds) => {
    if (milliseconds === 0) return '0 секунд';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours} час${hours > 1 ? 'а' : ''} ${minutes % 60} мин`;
    } else if (minutes > 0) {
      return `${minutes} мин ${seconds % 60} сек`;
    } else {
      return `${seconds} сек`;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth>
        <InputLabel>Сотрудник</InputLabel>
        <Select
          value={selectedEmployee}
          onChange={handleEmployeeChange}
          label="Сотрудник"
        >
          {employees.map((employee) => {
            const displayName = employee.full_name || employee.email || `@${employee.username}` || `Сотрудник #${employee.id}`;
            const additionalInfo = [];
            
            if (employee.full_name && employee.email) {
              additionalInfo.push(employee.email);
            }
            if (employee.username) {
              additionalInfo.push(`@${employee.username}`);
            }
            
            const fullDisplayName = additionalInfo.length > 0 
              ? `${displayName} (${additionalInfo.join(', ')})`
              : displayName;
            
            return (
              <MenuItem key={employee.id} value={employee.id}>
                {fullDisplayName}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <DatePicker
            label="Дата начала"
            value={startDate}
            onChange={(newValue) => handleDateChange(newValue, endDate)}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
          <DatePicker
            label="Дата окончания"
            value={endDate}
            onChange={(newValue) => handleDateChange(startDate, newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
              },
            }}
          />
        </Box>
      </LocalizationProvider>

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {noDataAlert && !error && (
        <Alert severity="info">
          {noDataAlert}
        </Alert>
      )}

      {/* Статистика маршрутов */}
      <RouteStats routes={routes} />

      {/* Статистика обработки координат */}
      {routes.length > 0 && stats.processingStats && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`Исходных точек: ${stats.processingStats.totalOriginalPositions}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Сокращение: ${stats.processingStats.reductionPercent}%`}
            color="warning"
            variant="outlined"
          />
          <Chip
            label={`Время: ${formatDuration(stats.totalTime)}`}
            color="info"
            variant="outlined"
          />
        </Box>
      )}

      {/* Список маршрутов */}
      {routes.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Детали маршрутов ({routes.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {routes.map((route, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    p: 2, 
                    border: 1, 
                    borderColor: 'divider', 
                    borderRadius: 1,
                    backgroundColor: route.route_type === 'task' ? 'background.paper' : 'grey.50'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      {route.route_type === 'task' ? 'Задача' : 'Период'} #{index + 1}
                    </Typography>
                    <Chip 
                      label={route.route_type === 'task' ? 'Задача' : 'Период'} 
                      color={route.route_type === 'task' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </Box>
                  
                  {route.route_type === 'task' && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Название:</strong> {route.task_title}
                      </Typography>
                      <Chip 
                        label={getTaskStatusLabel(route.task_status)} 
                        color={getTaskStatusColor(route.task_status)}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Начало:</strong> {format(new Date(route.session_start), 'dd.MM.yyyy HH:mm')}
                    </Typography>
                    {route.session_end && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Конец:</strong> {format(new Date(route.session_end), 'dd.MM.yyyy HH:mm')}
                      </Typography>
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary">
                    <strong>Точек маршрута:</strong> {route.positions.length}
                  </Typography>

                  {/* Информация об обработке координат */}
                  {route.processingStats && (
                    <Box sx={{ mt: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Обработка координат:</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Исходных точек: {route.processingStats.totalOriginalPositions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Обработанных точек: {route.processingStats.totalProcessedPositions}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        • Сокращение: {route.processingStats.reductionPercent}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Легенда карты */}
      <MapLegend routes={routes} />

      {/* Информация о карте */}
      <MapInfo routes={routes} />

      <YandexMap 
        routes={routes}
        center={getMapCenter()}
        zoom={getMapZoom()}
      />
    </Box>
  );
};

export default PeriodTracker; 