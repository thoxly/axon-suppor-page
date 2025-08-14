import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import YandexMap from '../Map/YandexMap';
import MapLegend from '../Map/MapLegend';
import { calculateRouteCenter, calculateOptimalZoom } from '../../utils/mapUtils';
import { api } from '../../utils/api';

const TaskTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [noDataAlert, setNoDataAlert] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchTasks();
    } else {
      setTasks([]);
      setSelectedTask('');
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.employees.getAll();
      console.log('All employees response:', response);
      
      // API возвращает объект с полем employees
      const allEmployees = response.employees || [];
      console.log('All employees:', allEmployees);
      
      const activeEmployees = allEmployees.filter(emp => emp.status === 'active');
      console.log('Active employees:', activeEmployees);
      setEmployees(activeEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await api.tasks.getAll();
      console.log('All tasks:', response);
      console.log('Selected employee ID:', selectedEmployee);
      
      // API возвращает массив задач напрямую, а не в объекте tasks
      const allTasks = Array.isArray(response) ? response : [];
      
      // Фильтруем задачи, назначенные выбранному сотруднику
      const employeeTasks = allTasks.filter(task => {
        console.log(`Task ${task.id}: assigned_to=${task.assigned_to}, selectedEmployee=${selectedEmployee}`);
        return task.assigned_to === parseInt(selectedEmployee);
      });
      
      console.log('Filtered tasks for employee:', employeeTasks);
      setTasks(employeeTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Не удалось загрузить список задач');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (event) => {
    console.log('Employee changed to:', event.target.value);
    setSelectedEmployee(event.target.value);
    setSelectedTask('');
    setRoutes([]);
  };

  const handleTaskChange = (event) => {
    console.log('Task changed to:', event.target.value);
    setSelectedTask(event.target.value);
    setRoutes([]);
  };

  const fetchTaskRoutes = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      // Получаем сессии для задачи
      console.log('Fetching sessions for task:', selectedTask);
      const sessionsResponse = await api.sessions.getTaskSessions(selectedTask);
      
      if (!sessionsResponse.sessions || sessionsResponse.sessions.length === 0) {
        setNoDataAlert('Нет данных о сессиях для выбранной задачи');
        setRoutes([]);
        return;
      }
      
      // Получаем позиции для каждой сессии
      const routesData = [];
      
      for (const session of sessionsResponse.sessions) {
        try {
          // Получаем позиции для сессии
          const positionsResponse = await api.sessions.getSessionPositions(session.id);
          
          if (positionsResponse.positions && positionsResponse.positions.length > 0) {
            const route = {
              task_id: parseInt(selectedTask),
              task_title: tasks.find(t => t.id === parseInt(selectedTask))?.title || 'Задача',
              task_status: tasks.find(t => t.id === parseInt(selectedTask))?.status || 'unknown',
              route_type: 'task',
              session_id: session.id,
              session_start: session.start_time,
              session_end: session.end_time,
              positions: positionsResponse.positions.map(pos => ({
                latitude: pos.latitude,
                longitude: pos.longitude,
                timestamp: pos.timestamp
              }))
            };
            
            routesData.push(route);
          }
        } catch (sessionError) {
          console.error(`Error fetching positions for session ${session.id}:`, sessionError);
        }
      }
      
      if (routesData.length === 0) {
        setNoDataAlert('Нет данных о перемещениях для выбранной задачи');
        setRoutes([]);
        return;
      }
      
      console.log('Task routes:', routesData);
      setRoutes(routesData);
    } catch (err) {
      console.error('Error fetching task routes:', err);
      setError('Не удалось загрузить маршруты задачи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect triggered - selectedEmployee:', selectedEmployee, 'selectedTask:', selectedTask);
    if (selectedEmployee && selectedTask) {
      fetchTaskRoutes();
    }
  }, [selectedEmployee, selectedTask]);

  // Calculate map center based on all route points
  const getMapCenter = () => {
    return calculateRouteCenter(routes);
  };

  // Calculate optimal zoom for routes
  const getMapZoom = () => {
    return calculateOptimalZoom(routes, 9);
  };

  // Получаем статистику по маршрутам задачи
  const getTaskRouteStats = () => {
    if (routes.length === 0) {
      return {
        totalRoutes: 0,
        totalPositions: 0,
        totalDistance: 0,
        totalTime: 0,
        totalSessions: 0
      };
    }

    let totalPositions = 0;
    let totalTime = 0;
    let totalSessions = routes.length;

    routes.forEach(route => {
      totalPositions += route.positions.length;
      
      if (route.session_start && route.session_end) {
        const sessionTime = new Date(route.session_end) - new Date(route.session_start);
        totalTime += sessionTime;
      }
    });
    
    return {
      totalRoutes: routes.length,
      totalPositions: totalPositions,
      totalDistance: 0, // TODO: Добавить расчет расстояния
      totalTime: totalTime,
      totalSessions: totalSessions
    };
  };

  const stats = getTaskRouteStats();

  // Функция для получения цвета статуса задачи
  const getTaskStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'accepted':
        return 'primary';
      case 'assigned':
        return 'info';
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
      case 'accepted':
        return 'Принята';
      case 'assigned':
        return 'Назначена';
      case 'pending':
        return 'Ожидает';
      default:
        return status;
    }
  };

  // Форматирование времени
  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}м`;
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

      <FormControl fullWidth>
        <InputLabel>Задача</InputLabel>
        <Select
          value={selectedTask}
          onChange={handleTaskChange}
          label="Задача"
          disabled={!selectedEmployee || tasks.length === 0}
        >
          {tasks.map((task) => (
            <MenuItem key={task.id} value={task.id}>
              <Box>
                <Typography variant="body1">{task.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Статус: {getTaskStatusLabel(task.status)}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

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

      {/* Статистика маршрутов задачи */}
      {routes.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Сессий: ${stats.totalSessions}`} color="primary" />
            <Chip label={`Точек: ${stats.totalPositions}`} color="secondary" />
            <Chip label={`Время: ${formatDuration(stats.totalTime)}`} color="info" />
          </Box>
        </Box>
      )}

      {/* Список маршрутов задачи */}
      {routes.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Маршруты задачи ({routes.length})</Typography>
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
                    backgroundColor: 'background.paper'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1">
                      Сессия #{index + 1}
                    </Typography>
                    <Chip 
                      label={getTaskStatusLabel(route.task_status)} 
                      color={getTaskStatusColor(route.task_status)}
                      size="small"
                    />
                  </Box>
                  
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

      <YandexMap 
        routes={routes}
        center={getMapCenter()}
        zoom={getMapZoom()}
      />
    </Box>
  );
};

export default TaskTracker; 