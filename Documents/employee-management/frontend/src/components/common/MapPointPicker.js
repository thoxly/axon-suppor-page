import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import { YMaps, Map, Placemark } from '@pbe/react-yandex-maps';
import { reverseGeocode, checkApiKeys } from '../../utils/yandexGeocoder';

const MapPointPicker = ({
  open = false,
  onClose,
  onPointSelect,
  initialCenter = [55.751244, 37.618423], // Москва по умолчанию
  initialZoom = 10,
  title = 'Выберите точку на карте'
}) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mapRef = useRef(null);
  const apiKeys = checkApiKeys();

  // Очищаем состояние при открытии/закрытии
  useEffect(() => {
    if (!open) {
      setSelectedPoint(null);
      setAddress('');
      setError('');
    }
  }, [open]);

  // Обработчик клика по карте
  const handleMapClick = async (event) => {
    const coords = event.get('coords');
    if (!coords || coords.length !== 2) return;

    const [latitude, longitude] = coords;
    setSelectedPoint({ latitude, longitude });
    setError('');

    // Получаем адрес по координатам
    try {
      setLoading(true);
      const addressData = await reverseGeocode(latitude, longitude);
      if (addressData && addressData.address) {
        setAddress(addressData.address);
      } else {
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch (error) {
      console.error('Error getting address for coordinates:', error);
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик подтверждения выбора
  const handleConfirm = () => {
    if (!selectedPoint) {
      setError('Выберите точку на карте');
      return;
    }

    onPointSelect?.({
      coordinates: selectedPoint,
      address: address
    });
    onClose();
  };

  // Обработчик отмены
  const handleCancel = () => {
    onClose();
  };

  // Проверяем доступность API ключа
  if (!apiKeys.geocoder) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            API ключ для Яндекс Карт не настроен. Невозможно открыть карту.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <YMaps query={{ apikey: process.env.REACT_APP_YANDEX_MAP_JS_API }}>
            <Map
              defaultState={{
                center: initialCenter,
                zoom: initialZoom
              }}
              width="100%"
              height="100%"
              onClick={handleMapClick}
              instanceRef={mapRef}
              options={{
                suppressMapOpenBlock: true
              }}
            >
              {selectedPoint && (
                <Placemark
                  geometry={[selectedPoint.latitude, selectedPoint.longitude]}
                  options={{
                    preset: 'islands#redDotIcon'
                  }}
                />
              )}
            </Map>
          </YMaps>
        </Box>
        
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                Получение адреса...
              </Typography>
            </Box>
          )}
          
          {selectedPoint && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Координаты: {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
              </Typography>
              {address && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  <strong>Адрес:</strong> {address}
                </Typography>
              )}
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          )}
          
          <Typography variant="caption" color="text.secondary">
            Кликните на карту, чтобы выбрать точку
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleCancel}>
          Отмена
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!selectedPoint}
        >
          Выбрать точку
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MapPointPicker; 