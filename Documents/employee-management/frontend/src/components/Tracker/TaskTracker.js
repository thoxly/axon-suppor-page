import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  CircularProgress,
  Alert,
} from '@mui/material';
import YandexMap from '../Map/YandexMap';
import { api } from '../../utils/api';

const TaskTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [route, setRoute] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noDataAlert, setNoDataAlert] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchCompletedTasks();
    } else {
      setTasks([]);
      setSelectedTask(null);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await api.employees.getAll();
      if (!response || !response.employees) {
        throw new Error('Invalid response format from server');
      }
      const activeEmployees = response.employees.filter(emp => emp.status === 'active');
      setEmployees(activeEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Не удалось загрузить список сотрудников');
    } finally {
      setLoading(false);
    }
  };

  // TODO: Implement actual API call
  const fetchCompletedTasks = async () => {
    if (!selectedEmployee) return;
    
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      // This will be replaced with actual API call
      console.log('Fetching completed tasks for employee:', selectedEmployee);
      
      // Placeholder data - simulating no tasks for testing
      const mockTasks = [];
      
      if (mockTasks.length === 0) {
        setNoDataAlert('У выбранного сотрудника нет завершенных задач');
      }
      
      setTasks(mockTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Не удалось загрузить список задач');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // TODO: Implement actual API call
  const fetchTaskRoute = async (taskId) => {
    if (!taskId) return;
    
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      // This will be replaced with actual API call
      console.log('Fetching route for task:', taskId);
      
      // Placeholder route data - simulating no route for testing
      const mockRoute = [];
      
      if (mockRoute.length === 0) {
        setNoDataAlert('Нет данных о перемещениях по выбранной задаче');
      }
      
      setRoute(mockRoute);
    } catch (err) {
      console.error('Error fetching route:', err);
      setError('Не удалось загрузить маршрут');
      setRoute([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (event) => {
    const value = event.target.value;
    setSelectedEmployee(value);
    setSelectedTask(null);
    setRoute([]);
    setError(null);
    setNoDataAlert(null);
  };

  const handleTaskChange = (event, newValue) => {
    setSelectedTask(newValue);
    setRoute([]);
    setError(null);
    setNoDataAlert(null);
    
    if (newValue?.id) {
      fetchTaskRoute(newValue.id);
    }
  };

  const getMapPoints = () => {
    if (!route || route.length === 0) return [];
    
    return route.map((coords, index) => ({
      coordinates: [coords[1], coords[0]], // Fix coordinate order: [lat, lon]
      description: selectedTask 
        ? `${selectedTask.title || 'Задача'} - Точка ${index + 1}`
        : `Точка ${index + 1}`
    }));
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
          <MenuItem value="">
            <em>Выберите сотрудника</em>
          </MenuItem>
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

      <Autocomplete
        value={selectedTask}
        onChange={handleTaskChange}
        options={tasks}
        getOptionLabel={(option) => option ? `${option.title || ''} (${option.address || ''})` : ''}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Выберите завершенную задачу"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading && <CircularProgress size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        loading={loading}
        disabled={!selectedEmployee}
        noOptionsText={
          selectedEmployee 
            ? "Нет завершенных задач"
            : "Сначала выберите сотрудника"
        }
      />

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

      <YandexMap 
        route={route}
        points={getMapPoints()}
      />
    </Box>
  );
};

export default TaskTracker; 