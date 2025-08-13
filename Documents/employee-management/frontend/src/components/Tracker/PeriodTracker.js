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
      
      const response = await api.employees.getPositions(selectedEmployee, startDate, endDate);
      
      console.log('🔍 API Response:', response);
      console.log('🔍 Routes data:', response.routes);
      console.log('🔍 Routes count:', response.routes?.length);
      
      if (!response.routes || response.routes.length === 0) {
        setNoDataAlert(`Нет данных о перемещениях сотрудника за выбранный период ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
        setRoutes([]);
        return;
      }
      
      setRoutes(response.routes);
    } catch (err) {
      console.error('Error fetching routes:', err);
      setError('Не удалось загрузить маршруты');
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
    const taskRoutes = routes.filter(route => route.route_type === 'task');
    const sessionRoutes = routes.filter(route => route.route_type === 'session');
    
    return {
      totalRoutes: routes.length,
      taskRoutes: taskRoutes.length,
      sessionRoutes: sessionRoutes.length,
      totalPositions: routes.reduce((sum, route) => sum + route.positions.length, 0)
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
                      {route.route_type === 'task' ? 'Задача' : 'Без задачи'} #{index + 1}
                    </Typography>
                    <Chip 
                      label={route.route_type === 'task' ? 'Задача' : 'Без задачи'} 
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