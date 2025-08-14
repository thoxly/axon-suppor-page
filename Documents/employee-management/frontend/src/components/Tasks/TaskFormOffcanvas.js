import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Switch,
  FormControlLabel,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ru } from 'date-fns/locale';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import useAuth from '../../hooks/useAuth';
import { api } from '../../utils/api';
import { toUTC, toLocal, hasTimeComponent } from '../../utils/dateUtils';
import AddressAutocomplete from '../common/AddressAutocomplete';

const TaskFormOffcanvas = ({ open, onClose, task, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    employeeId: '',
    startDate: null,
    deadline: null,
    description: '',
    requiresVerification: false,
    finishPointLatitude: null,
    finishPointLongitude: null,
  });
  const [showStartTime, setShowStartTime] = useState(false);
  const [showDeadlineTime, setShowDeadlineTime] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      if (task) {
        const startDate = task.start_date ? toLocal(task.start_date) : null;
        const deadline = task.end_date ? toLocal(task.end_date) : null;
        
        setFormData({
          title: task.title || '',
          address: task.address || '',
          employeeId: task.assigned_to || '',
          startDate,
          deadline,
          description: task.description || '',
          requiresVerification: task.requires_verification || false,
          finishPointLatitude: task.finish_point_latitude || null,
          finishPointLongitude: task.finish_point_longitude || null,
        });
        
        setShowStartTime(startDate ? hasTimeComponent(startDate) : false);
        setShowDeadlineTime(deadline ? hasTimeComponent(deadline) : false);
      } else {
        resetForm();
      }
    }
  }, [open, task]);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      console.log('Starting to fetch employees...');
      const response = await api.employees.getAll();
      console.log('Full API response:', response);
      
      if (!response || !response.employees) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }
      
      const activeEmployees = response.employees.filter(emp => emp.status === 'active');
      console.log('Active employees:', activeEmployees);
      setEmployees(activeEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack
      });
      setErrors(prev => ({ ...prev, employees: 'Не удалось загрузить список сотрудников' }));
    } finally {
      setLoadingEmployees(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      address: '',
      employeeId: '',
      startDate: null,
      deadline: null,
      description: '',
      requiresVerification: false,
      finishPointLatitude: null,
      finishPointLongitude: null,
    });
    setShowStartTime(false);
    setShowDeadlineTime(false);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Название обязательно';
    }
    if (formData.deadline && formData.startDate && formData.deadline < formData.startDate) {
      newErrors.deadline = 'Дедлайн не может быть раньше даты начала';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        address: formData.address,
        assigned_to: formData.employeeId || null,
        requires_verification: formData.requiresVerification,
        start_date: formData.startDate ? toUTC(formData.startDate).toISOString() : null,
        end_date: formData.deadline ? toUTC(formData.deadline).toISOString() : null,
        status: formData.employeeId ? 'assigned' : 'not-assigned',
        finish_point_latitude: formData.finishPointLatitude,
        finish_point_longitude: formData.finishPointLongitude,
      };

      await onSubmit(payload);
      resetForm();
    } catch (err) {
      console.error('Error saving task:', err);
      setErrors({ submit: 'Не удалось сохранить задачу' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddressChange = (address) => {
    setFormData((prev) => ({ ...prev, address }));
    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: undefined }));
    }
  };

  const handleCoordinatesChange = (coordinates) => {
    console.log('TaskFormOffcanvas: handleCoordinatesChange called with:', coordinates);
    
    if (coordinates) {
      console.log('Setting coordinates:', coordinates.latitude, coordinates.longitude);
      setFormData((prev) => ({
        ...prev,
        finishPointLatitude: coordinates.latitude,
        finishPointLongitude: coordinates.longitude
      }));
    } else {
      console.log('Clearing coordinates');
      setFormData((prev) => ({
        ...prev,
        finishPointLatitude: null,
        finishPointLongitude: null
      }));
    }
  };

  const DateTimeField = ({ label, value, onChange, showTime, onToggleTime, error, helperText }) => {
    const handleTimeToggle = (show) => {
      if (!show && value) {
        // Reset time to start of day when disabling time picker
        const dateWithoutTime = new Date(value);
        dateWithoutTime.setHours(0, 0, 0, 0);
        onChange(dateWithoutTime);
      }
      onToggleTime(show);
    };

    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, width: '100%' }}>
        <DatePicker
          label={label}
          value={value}
          onChange={onChange}
          slotProps={{
            textField: {
              fullWidth: true,
              error: !!error,
              helperText: helperText,
              size: "medium",
              sx: { 
                minWidth: 0,
                width: showTime ? '65%' : '100%'
              }
            },
          }}
        />
        {value && (
          <>
            <Tooltip title={showTime ? "Убрать время" : "Добавить время"}>
              <IconButton
                size="small"
                onClick={() => handleTimeToggle(!showTime)}
                color={showTime ? "primary" : "default"}
                sx={{ mt: 1, ml: -0.5, mr: -0.5 }}
              >
                <AccessTimeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {showTime && (
              <TimePicker
                value={value}
                onChange={onChange}
                slotProps={{
                  textField: {
                    size: "medium",
                    sx: { 
                      width: '130px',
                      '& .MuiInputLabel-root': {
                        display: 'none'
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: error ? 'error.main' : 'rgba(0, 0, 0, 0.23)'
                        }
                      }
                    }
                  },
                }}
              />
            )}
          </>
        )}
      </Box>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { 
          width: { xs: '100%', sm: 400 },
          overflow: 'hidden'
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          overflow: 'auto',
        }}
      >
        <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
          {task ? 'Редактировать задачу' : 'Новая задача'}
        </Typography>

        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Название"
            required
            value={formData.title}
            onChange={handleChange('title')}
            error={!!errors.title}
            helperText={errors.title}
          />

          <AddressAutocomplete
            label="Адрес"
            value={formData.address}
            onChange={handleAddressChange}
            onCoordinatesChange={handleCoordinatesChange}
            placeholder="Введите адрес задачи"
          />

          <FormControl fullWidth>
            <InputLabel>Сотрудник</InputLabel>
            <Select
              value={formData.employeeId}
              onChange={handleChange('employeeId')}
              label="Сотрудник"
              error={!!errors.employees}
            >
              <MenuItem value="">
                <em>Не назначен</em>
              </MenuItem>
              {employees.map((employee) => {
                let displayName = '';
                
                // В первую очередь показываем полное имя
                if (employee.full_name) {
                  displayName = employee.full_name;
                } else if (employee.email) {
                  displayName = employee.email;
                } else if (employee.username) {
                  displayName = `@${employee.username}`;
                } else {
                  displayName = `Сотрудник #${employee.id}`;
                }
                
                // Добавляем дополнительную информацию в скобках
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
            {loadingEmployees && (
              <FormHelperText>
                <CircularProgress size={16} /> Загрузка сотрудников...
              </FormHelperText>
            )}
            {errors.employees && (
              <FormHelperText error>
                {errors.employees}
              </FormHelperText>
            )}
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ru}>
            <DateTimeField
              label="Дата начала"
              value={formData.startDate}
              onChange={(newValue) =>
                setFormData((prev) => ({ ...prev, startDate: newValue }))
              }
              showTime={showStartTime}
              onToggleTime={setShowStartTime}
            />

            <DateTimeField
              label="Дедлайн"
              value={formData.deadline}
              onChange={(newValue) =>
                setFormData((prev) => ({ ...prev, deadline: newValue }))
              }
              showTime={showDeadlineTime}
              onToggleTime={setShowDeadlineTime}
              error={!!errors.deadline}
              helperText={errors.deadline}
            />
          </LocalizationProvider>

          <TextField
            label="Описание"
            value={formData.description}
            onChange={handleChange('description')}
            multiline
            rows={4}
          />

          <FormControlLabel
            control={
              <Switch
                checked={formData.requiresVerification}
                onChange={handleChange('requiresVerification')}
              />
            }
            label="Требуется проверка"
          />

          {errors.submit && (
            <Typography color="error" variant="body2">
              {errors.submit}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
          <Button
            variant="contained"
            type="submit"
            disabled={loading}
            sx={{ flex: 1 }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : task ? (
              'Сохранить'
            ) : (
              'Создать'
            )}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              onClose();
              resetForm();
            }}
            sx={{ flex: 1 }}
          >
            Отмена
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default TaskFormOffcanvas; 