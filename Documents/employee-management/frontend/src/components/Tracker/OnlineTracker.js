import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
} from '@mui/material';
import YandexMap from '../Map/YandexMap';
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

  // TODO: Implement actual API call
  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      // This will be replaced with actual API call
      console.log('Fetching locations for employee:', selectedEmployee || 'all');
      
      // Placeholder data
      const mockLocations = selectedEmployee 
        ? []  // Simulating no data for testing
        : [];

      if (mockLocations.length === 0) {
        setNoDataAlert(
          selectedEmployee 
            ? 'Выбранный сотрудник не в сети'
            : 'Нет сотрудников онлайн'
        );
      }
      
      setEmployeeLocations(mockLocations);
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
      />

      <Typography variant="caption" color="text.secondary" align="right">
        Обновляется каждые {POLLING_INTERVAL / 1000} секунд
      </Typography>
    </Box>
  );
};

export default OnlineTracker; 