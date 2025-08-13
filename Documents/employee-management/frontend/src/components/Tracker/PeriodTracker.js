import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import { differenceInDays, startOfDay, endOfDay } from 'date-fns';
import YandexMap from '../Map/YandexMap';
import { api } from '../../utils/api';

const PeriodTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [route, setRoute] = useState([]);
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
    // Reset route when employee changes
    setRoute([]);
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

  const fetchRoute = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoDataAlert(null);
      
      const response = await api.employees.getPositions(selectedEmployee, startDate, endDate);
      
      console.log('🔍 API Response:', response);
      console.log('🔍 Route data:', response.route);
      console.log('🔍 Route length:', response.route?.length);
      
      if (response.route.length === 0) {
        setNoDataAlert(`Нет данных о перемещениях сотрудника за выбранный период ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
      }
      
      // Используем координаты как есть (они уже в правильном формате [latitude, longitude])
      const transformedRoute = response.route;
      console.log('🔍 Route from API:', transformedRoute);
      console.log('🔍 Route length:', transformedRoute.length);
      
      // Check if all coordinates are the same
      const uniqueCoordinates = new Set(transformedRoute.map(coord => `${coord[0]},${coord[1]}`));
      console.log('🔍 Unique coordinates:', uniqueCoordinates.size);
      
      if (transformedRoute.length > 0 && uniqueCoordinates.size === 1) {
        setNoDataAlert('Все точки маршрута находятся в одном месте. Линия не будет отображаться.');
      }
      
      setRoute(transformedRoute);
    } catch (err) {
      console.error('Error fetching route:', err);
      setError('Не удалось загрузить маршрут');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEmployee && validateDateRange() && startDate && endDate) {
      fetchRoute();
    }
  }, [selectedEmployee, startDate, endDate]);

  // Calculate map center based on route points
  const getMapCenter = () => {
    if (route.length === 0) return [55.751244, 37.618423]; // Default to Moscow
    
    const latSum = route.reduce((sum, point) => sum + point[0], 0);
    const lonSum = route.reduce((sum, point) => sum + point[1], 0);
    return [latSum / route.length, lonSum / route.length];
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

      <YandexMap 
        route={route}
        center={getMapCenter()}
        points={route.map((coords, index) => ({
          coordinates: coords,
          description: `Точка ${index + 1}`
        }))}
        zoom={route.length > 0 ? 12 : 9}
      />
    </Box>
  );
};

export default PeriodTracker; 