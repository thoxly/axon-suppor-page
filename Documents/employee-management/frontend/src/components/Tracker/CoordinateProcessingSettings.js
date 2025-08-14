import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { api } from '../../utils/api';
import { useAuthContext } from '../../context/AuthContext';

const CoordinateProcessingSettings = () => {
  const { isManager } = useAuthContext();
  const [settings, setSettings] = useState({
    maxSpeedKmh: 100,
    minSpeedKmh: 0.1,
    clusterRadiusMeters: 20,
    timeWindowMs: 30000,
    minPointsForMedian: 3
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.coordinateProcessing.getProcessingSettings();
      setSettings(response);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Не удалось загрузить настройки обработки координат');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      await api.coordinateProcessing.updateProcessingSettings(settings);
      setSuccess('Настройки успешно обновлены');
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Не удалось обновить настройки');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSettings({
      maxSpeedKmh: 100,
      minSpeedKmh: 0.1,
      clusterRadiusMeters: 20,
      timeWindowMs: 30000,
      minPointsForMedian: 3
    });
  };

  // Преобразование времени из миллисекунд в секунды для отображения
  const timeWindowSeconds = settings.timeWindowMs / 1000;

  if (!isManager()) {
    return (
      <Alert severity="info">
        Настройки обработки координат доступны только для менеджеров
      </Alert>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 1 }} />
        <Typography variant="h6">
          Настройки обработки координат
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Параметры фильтрации и обработки
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Фильтрация по скорости */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Фильтрация по скорости
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Максимальная скорость (км/ч)"
                  type="number"
                  value={settings.maxSpeedKmh}
                  onChange={(e) => handleSettingChange('maxSpeedKmh', parseFloat(e.target.value))}
                  inputProps={{ min: 1, max: 500, step: 1 }}
                  sx={{ minWidth: 200 }}
                  helperText="Точки с большей скоростью будут отфильтрованы"
                />
                <TextField
                  label="Минимальная скорость (км/ч)"
                  type="number"
                  value={settings.minSpeedKmh}
                  onChange={(e) => handleSettingChange('minSpeedKmh', parseFloat(e.target.value))}
                  inputProps={{ min: 0, max: 50, step: 0.1 }}
                  sx={{ minWidth: 200 }}
                  helperText="Точки с меньшей скоростью будут отфильтрованы"
                />
              </Box>
            </Box>

            <Divider />

            {/* Кластеризация */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Кластеризация точек
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  label="Радиус кластера (метры)"
                  type="number"
                  value={settings.clusterRadiusMeters}
                  onChange={(e) => handleSettingChange('clusterRadiusMeters', parseInt(e.target.value))}
                  inputProps={{ min: 1, max: 1000, step: 1 }}
                  sx={{ minWidth: 200 }}
                  helperText="Точки в радиусе будут сгруппированы"
                />
                <TextField
                  label="Временное окно (секунды)"
                  type="number"
                  value={timeWindowSeconds}
                  onChange={(e) => handleSettingChange('timeWindowMs', parseInt(e.target.value) * 1000)}
                  inputProps={{ min: 1, max: 300, step: 1 }}
                  sx={{ minWidth: 200 }}
                  helperText="Точки в временном окне будут сгруппированы"
                />
              </Box>
            </Box>

            <Divider />

            {/* Медианное усреднение */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Медианное усреднение
              </Typography>
              <TextField
                label="Минимум точек для медианы"
                type="number"
                value={settings.minPointsForMedian}
                onChange={(e) => handleSettingChange('minPointsForMedian', parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10, step: 1 }}
                sx={{ minWidth: 200 }}
                helperText="Минимальное количество точек для вычисления медианы"
              />
            </Box>

          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Предустановленные профили */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">
            Предустановленные профили
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              onClick={() => setSettings({
                maxSpeedKmh: 50,
                minSpeedKmh: 0.5,
                clusterRadiusMeters: 10,
                timeWindowMs: 15000,
                minPointsForMedian: 3
              })}
            >
              Строгая фильтрация
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSettings({
                maxSpeedKmh: 100,
                minSpeedKmh: 0.1,
                clusterRadiusMeters: 20,
                timeWindowMs: 30000,
                minPointsForMedian: 3
              })}
            >
              Стандартная
            </Button>
            <Button
              variant="outlined"
              onClick={() => setSettings({
                maxSpeedKmh: 200,
                minSpeedKmh: 0.05,
                clusterRadiusMeters: 50,
                timeWindowMs: 60000,
                minPointsForMedian: 2
              })}
            >
              Мягкая фильтрация
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Текущие настройки */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Текущие настройки:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={`Макс. скорость: ${settings.maxSpeedKmh} км/ч`} size="small" />
          <Chip label={`Мин. скорость: ${settings.minSpeedKmh} км/ч`} size="small" />
          <Chip label={`Радиус кластера: ${settings.clusterRadiusMeters}м`} size="small" />
          <Chip label={`Временное окно: ${timeWindowSeconds}с`} size="small" />
          <Chip label={`Мин. точек: ${settings.minPointsForMedian}`} size="small" />
        </Box>
      </Box>

      {/* Кнопки управления */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={loading}
        >
          Сбросить к умолчаниям
        </Button>
      </Box>
    </Paper>
  );
};

export default CoordinateProcessingSettings; 