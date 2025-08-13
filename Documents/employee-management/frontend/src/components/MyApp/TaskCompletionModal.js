import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoCameraIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { api } from '../../utils/api';

const TaskCompletionModal = ({ 
  open, 
  onClose, 
  task, 
  onTaskCompleted,
  telegramId 
}) => {
  const theme = useTheme();
  const [result, setResult] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleClose = () => {
    if (!loading) {
      setResult('');
      setPhotos([]);
      setError('');
      onClose();
    }
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const newPhotos = files.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleTakePhoto = (event) => {
    const files = Array.from(event.target.files);
    const newPhotos = files.map(file => ({
      file,
      id: Date.now() + Math.random(),
      preview: URL.createObjectURL(file)
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const handleSubmit = async () => {
    if (!result.trim()) {
      setError('Пожалуйста, опишите результат выполнения задачи');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Создаем FormData для отправки файлов
      const formData = new FormData();
      formData.append('result', result);
      formData.append('taskId', task.id);
      
      // Добавляем фотографии
      photos.forEach((photo, index) => {
        formData.append(`photos`, photo.file);
      });

      // Определяем новый статус в зависимости от requires_verification
      const newStatus = task.requires_verification ? 'completed' : 'done';
      formData.append('status', newStatus);

      // Отправляем запрос на завершение задачи
      const updatedTask = await api.tasks.complete(task.id, formData, telegramId);
      
      // Очищаем состояние
      setResult('');
      setPhotos([]);
      setError('');
      
      // Вызываем колбэк
      onTaskCompleted(updatedTask);
      onClose();
      
    } catch (error) {
      console.error('Error completing task:', error);
      setError(error.message || 'Произошла ошибка при завершении задачи');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = !result.trim() || loading;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${theme.palette.background.paper} 100%)`,
          backdropFilter: 'blur(10px)',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Завершить задачу
        </Typography>
        <IconButton onClick={handleClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Информация о задаче */}
        <Box sx={{ mb: 3, p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            {task?.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {task?.description}
          </Typography>
        </Box>

        {/* Форма результата */}
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Результат выполнения"
          placeholder="Опишите, что было выполнено..."
          value={result}
          onChange={(e) => setResult(e.target.value)}
          disabled={loading}
          sx={{ mb: 3 }}
        />

        {/* Загрузка фотографий */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Фотографии (необязательно)
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Выбрать файлы
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={() => cameraInputRef.current?.click()}
              disabled={loading}
              sx={{ borderRadius: 2 }}
            >
              Сделать фото
            </Button>
          </Box>

          {/* Скрытые input'ы */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            multiple
            accept="image/*"
            capture="environment"
            onChange={handleTakePhoto}
            style={{ display: 'none' }}
          />

          {/* Предварительный просмотр фотографий */}
          {photos.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {photos.map((photo) => (
                <Box
                  key={photo.id}
                  sx={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    borderRadius: 1,
                    overflow: 'hidden',
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                  }}
                >
                  <img
                    src={photo.preview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removePhoto(photo.id)}
                    disabled={loading}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: alpha(theme.palette.error.main, 0.8),
                      color: 'white',
                      '&:hover': {
                        bgcolor: theme.palette.error.main,
                      },
                      width: 24,
                      height: 24,
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Информация о статусе */}
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            После завершения задача будет переведена в статус{' '}
            <strong>
              {task?.requires_verification ? 'Завершена' : 'Завершена'}
            </strong>
          </Typography>
        </Alert>

        {/* Ошибка */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleClose} 
          disabled={loading}
          sx={{ borderRadius: 2 }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          startIcon={loading ? <CircularProgress size={16} /> : null}
          sx={{ 
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
            },
          }}
        >
          {loading ? 'Завершение...' : 'Завершить задачу'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskCompletionModal; 