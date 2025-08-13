import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Chip,
} from '@mui/material';
import YandexMap from '../Map/YandexMap';
import { calculateRouteCenter, calculateOptimalZoom } from '../../utils/mapUtils';
import { api } from '../../utils/api';

const POLLING_INTERVAL = 30000; // 30 seconds

const OnlineTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeLocations, setEmployeeLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noDataAlert, setNoDataAlert] = useState(null);

  useEffect(() => {
    fetchEmployees();
    return () => {
      // Cleanup any pending timeouts/intervals when component unmounts
    };
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchLocations();

    // Set up polling
    const intervalId = setInterval(fetchLocations, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedEmployee]);

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

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      if (selectedEmployee) {
        // Получаем текущую позицию конкретного сотрудника
        const response = await api.sessions.getCurrentPositionById(selectedEmployee);
        
        if (response.hasPosition) {
          const employee = employees.find(emp => emp.id === parseInt(selectedEmployee));
          setEmployeeLocations([{
            id: selectedEmployee,
            name: employee?.full_name || employee?.email || `Сотрудник #${selectedEmployee}`,
            coordinates: [response.position.latitude, response.position.longitude],
            lastUpdate: new Date(response.position.timestamp).toLocaleString(),
            taskTitle: response.position.task_title,
            taskStatus: response.position.task_status,
            isActive: response.position.is_active
          }]);
        } else {
          setEmployeeLocations([]);
          setNoDataAlert('Выбранный сотрудник не в сети');
        }
      } else {
        // Получаем позиции всех активных сотрудников
        const allLocations = [];
        
        for (const employee of employees) {
          try {
            const response = await api.sessions.getCurrentPositionById(employee.id);
            if (response.hasPosition) {
              allLocations.push({
                id: employee.id,
                name: employee.full_name || employee.email || `Сотрудник #${employee.id}`,
                coordinates: [response.position.latitude, response.position.longitude],
                lastUpdate: new Date(response.position.timestamp).toLocaleString(),
                taskTitle: response.position.task_title,
                taskStatus: response.position.task_status,
                isActive: response.position.is_active
              });
            }
          } catch (err) {
            console.error(`Error fetching position for employee ${employee.id}:`, err);
          }
        }
        
        if (allLocations.length === 0) {
          setNoDataAlert('Нет сотрудников онлайн');
        }
        
        setEmployeeLocations(allLocations);
      }
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError('Не удалось получить местоположение сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (event) => {
    setSelectedEmployee(event.target.value);
    setNoDataAlert(null);
  };

  // Calculate map center based on employee locations
  const getMapCenter = () => {
    if (employeeLocations.length === 0) return [55.751244, 37.618423]; // Default to Moscow
    
    const latSum = employeeLocations.reduce((sum, emp) => sum + emp.coordinates[0], 0);
    const lonSum = employeeLocations.reduce((sum, emp) => sum + emp.coordinates[1], 0);
    return [latSum / employeeLocations.length, lonSum / employeeLocations.length];
  };

  // Calculate optimal zoom for employee locations
  const getMapZoom = () => {
    if (employeeLocations.length === 0) return 9;
    
    // Если сотрудники находятся близко друг к другу, увеличиваем зум
    const latitudes = employeeLocations.map(emp => emp.coordinates[0]);
    const longitudes = employeeLocations.map(emp => emp.coordinates[1]);
    
    const latDiff = Math.max(...latitudes) - Math.min(...latitudes);
    const lonDiff = Math.max(...longitudes) - Math.min(...longitudes);
    const maxDiff = Math.max(latDiff, lonDiff);
    
    if (maxDiff < 0.01) return 15; // Очень близко
    if (maxDiff < 0.05) return 12; // Близко
    if (maxDiff < 0.1) return 10; // Средне
    return 8; // Далеко
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
            <em>Все сотрудники</em>
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

      {/* Статистика онлайн сотрудников */}
      {employeeLocations.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`Онлайн: ${employeeLocations.length}`} color="success" />
          <Chip label={`Всего сотрудников: ${employees.length}`} color="primary" />
        </Box>
      )}

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
        employees={employeeLocations}
        center={getMapCenter()}
        zoom={getMapZoom()}
      />

      <Typography variant="caption" color="text.secondary" align="right">
        Обновляется каждые {POLLING_INTERVAL / 1000} секунд
      </Typography>
    </Box>
  );
};

export default OnlineTracker; 