import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  LocationOn,
  Clear
} from '@mui/icons-material';
import { getAddressSuggestions, geocodeAddress, reverseGeocode, checkApiKeys } from '../../utils/yandexGeocoder';
import MapPointPicker from './MapPointPicker';

const AddressAutocomplete = ({
  value = '',
  onChange,
  onCoordinatesChange,
  placeholder = 'Введите адрес',
  label = 'Адрес',
  error = false,
  helperText = '',
  disabled = false,
  showMapPicker = true,
  required = false,
  fullWidth = true,
  size = 'medium',
  sx = {}
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [apiError, setApiError] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const timeoutRef = useRef(null);
  const apiKeys = checkApiKeys();

  // Проверяем доступность API ключей при монтировании
  useEffect(() => {
    console.log('AddressAutocomplete: Checking API keys...');
    const keys = checkApiKeys();
    console.log('AddressAutocomplete: API keys status:', keys);
    
    if (!keys.geosuggest) {
      setApiError('API ключ для Геосаджеста не настроен');
    } else {
      setApiError('');
    }
  }, []);

  // Синхронизируем значение с внешним состоянием
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Функция для получения подсказок с debounce
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    if (!apiKeys.geosuggest) {
      setSuggestions([]);
      return;
    }

    try {
      setLoading(true);
      setApiError('');
      
      const results = await getAddressSuggestions(query, { limit: 10 });
      console.log('Raw API results:', results);
      
      // Нормализуем результаты, убеждаясь что все объекты имеют правильную структуру
      const normalizedResults = results.map(item => ({
        id: item.id || `suggestion-${Math.random()}`,
        title: item.title || '',
        subtitle: item.subtitle || '',
        value: item.value || item.title || '',
        type: item.type || 'geo',
        coordinates: item.coordinates || null
      }));
      
      console.log('Normalized results:', normalizedResults);
      console.log('Setting suggestions state with:', normalizedResults);
      setSuggestions(normalizedResults);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setApiError('Ошибка при получении подсказок адресов');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [apiKeys.geosuggest]);

  // Обработчик изменения ввода с debounce
  const handleInputChange = useCallback((event, newInputValue) => {
    // Добавляем проверку на undefined
    if (newInputValue === undefined) {
      newInputValue = '';
    }
    
    setInputValue(newInputValue);
    
    // Очищаем предыдущий таймаут
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Устанавливаем новый таймаут для debounce
    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(newInputValue);
    }, 300);
  }, [fetchSuggestions]);

  // Обработчик выбора адреса
  const handleAddressSelect = useCallback(async (event, selectedOption) => {
    console.log('handleAddressSelect called with:', selectedOption);
    console.log('selectedOption type:', typeof selectedOption);
    console.log('selectedOption keys:', selectedOption ? Object.keys(selectedOption) : 'null');
    
    // Добавляем дополнительную проверку на null/undefined
    if (!selectedOption || selectedOption === null) {
      console.log('No option selected, clearing form');
      setInputValue('');
      setCoordinates(null);
      onChange?.('');
      onCoordinatesChange?.(null);
      return;
    }

    // Обрабатываем случай, когда пользователь ввел текст вручную
    if (typeof selectedOption === 'string') {
      console.log('String option selected:', selectedOption);
      setInputValue(selectedOption);
      onChange?.(selectedOption);
      // Попытка геокодирования введенного текста
      try {
        setLoading(true);
        const geocoded = await geocodeAddress(selectedOption);
        if (geocoded) {
          const coords = {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude
          };
          console.log('Geocoded coordinates:', coords);
          setCoordinates(coords);
          onCoordinatesChange?.(coords);
        }
      } catch (error) {
        console.error('Error geocoding manually entered address:', error);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Проверяем, что selectedOption является объектом
    if (typeof selectedOption !== 'object') {
      console.log('Invalid option type, clearing form');
      setInputValue('');
      setCoordinates(null);
      onChange?.('');
      onCoordinatesChange?.(null);
      return;
    }

    // Обрабатываем выбор из подсказок
    const addressText = selectedOption.value || selectedOption.title || '';
    console.log('Selected address text:', addressText);
    setInputValue(addressText);
    onChange?.(addressText);

    // Если у подсказки есть координаты, используем их
    if (selectedOption.coordinates) {
      const coords = {
        latitude: selectedOption.coordinates.latitude,
        longitude: selectedOption.coordinates.longitude
      };
      console.log('Using coordinates from suggestion:', coords);
      setCoordinates(coords);
      onCoordinatesChange?.(coords);
    } else {
      // Иначе геокодируем адрес
      console.log('No coordinates in suggestion, geocoding address');
      try {
        setLoading(true);
        const geocoded = await geocodeAddress(addressText);
        if (geocoded) {
          const coords = {
            latitude: geocoded.latitude,
            longitude: geocoded.longitude
          };
          console.log('Geocoded coordinates:', coords);
          setCoordinates(coords);
          onCoordinatesChange?.(coords);
        }
      } catch (error) {
        console.error('Error geocoding address:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [onChange, onCoordinatesChange]);

  // Обработчик выбора точки на карте
  const handleMapPick = useCallback(() => {
    setMapPickerOpen(true);
  }, []);

  // Обработчик выбора точки из карты
  const handleMapPointSelect = useCallback((pointData) => {
    console.log('handleMapPointSelect called with:', pointData);
    
    if (pointData && pointData.coordinates && pointData.address) {
      setInputValue(pointData.address);
      setCoordinates(pointData.coordinates);
      onChange?.(pointData.address);
      onCoordinatesChange?.(pointData.coordinates);
    }
  }, [onChange, onCoordinatesChange]);

  // Обработчик очистки
  const handleClear = useCallback(() => {
    setInputValue('');
    setCoordinates(null);
    setSuggestions([]);
    onChange?.('');
    onCoordinatesChange?.(null);
  }, [onChange, onCoordinatesChange]);



  // Очищаем таймаут при размонтировании
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Отладочная информация
  console.log('AddressAutocomplete render - suggestions:', suggestions);
  console.log('AddressAutocomplete render - inputValue:', inputValue);
  console.log('AddressAutocomplete render - loading:', loading);

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto', ...sx }}>
      <Autocomplete
        freeSolo
        options={suggestions || []}
        filterOptions={(options) => options}
        isOptionEqualToValue={(option, value) => {
          if (!option || !value) return false;
          if (typeof option === 'string' && typeof value === 'string') {
            return option === value;
          }
          if (typeof option === 'object' && typeof value === 'object') {
            return option.id === value.id || option.value === value.value;
          }
          return false;
        }}
        getOptionLabel={(option) => {
          // Добавляем дополнительную проверку на undefined/null
          if (!option || option === null) return '';
          if (typeof option === 'string') return option;
          
          // Проверяем, что option является объектом
          if (typeof option !== 'object') return '';
          
          // Добавляем отладочную информацию
          console.log('getOptionLabel called with:', option);
          
          // Убеждаемся, что объект имеет правильную структуру
          const safeOption = {
            id: option.id || `option-${Math.random()}`,
            title: option.title || '',
            subtitle: option.subtitle || '',
            value: option.value || option.title || '',
            type: option.type || 'geo',
            coordinates: option.coordinates || null
          };
          
          // Более надежная обработка данных
          const value = safeOption.value || safeOption.title || '';
          console.log('getOptionLabel returning:', value);
          return value;
        }}
        inputValue={inputValue || ''}
        onInputChange={handleInputChange}
        onChange={handleAddressSelect}
        loading={loading}
        disabled={disabled || !apiKeys.geosuggest}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            error={error || !!apiError}
            helperText={apiError || helperText}
            required={required}
            size={size}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {loading && <CircularProgress size={20} />}
                  {inputValue && (
                    <Tooltip title="Очистить">
                      <IconButton
                        size="small"
                        onClick={handleClear}
                        disabled={disabled}
                      >
                        <Clear fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {showMapPicker && (
                    <Tooltip title="Выбрать на карте">
                      <IconButton
                        size="small"
                        onClick={handleMapPick}
                        disabled={disabled}
                      >
                        <LocationOn fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )
            }}
          />
        )}
        renderOption={(props, option) => {
          // Добавляем проверку на undefined/null
          if (!option || option === null) return null;
          
          // Проверяем, что option является объектом
          if (typeof option !== 'object') return null;
          
          return (
            <Box component="li" {...props}>
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="body2" component="span">
                  {option.title || ''}
                </Typography>
                {option.subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {option.subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }}
        noOptionsText={inputValue && inputValue.length >= 2 ? "Адрес не найден" : "Введите адрес для поиска"}
        loadingText="Поиск адресов..."
      />
      
      {coordinates && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Координаты: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </Typography>
      )}
      
      {apiError && (
        <Alert severity="warning" sx={{ mt: 1 }}>
          {apiError}
        </Alert>
      )}
      
      <MapPointPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onPointSelect={handleMapPointSelect}
      />
    </Box>
  );
};

export default AddressAutocomplete; 