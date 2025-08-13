import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
  Divider,
  Chip,
  Modal,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { api } from '../../utils/api';
import { formatDate } from '../../utils/dateUtils';
import StatusBadge from '../common/StatusBadge';

const TaskConfirmationModal = ({ 
  open, 
  onClose, 
  task, 
  onTaskUpdated 
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
  };

  const handleImageModalClose = () => {
    setSelectedImage(null);
  };

  const handleConfirm = async (status) => {
    setLoading(true);
    setError('');

    try {
      await api.tasks.updateStatus(task.id, status);
      
      // Вызываем колбэк для обновления списка задач
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      onClose();
    } catch (error) {
      console.error('Error updating task status:', error);
      setError('Произошла ошибка при обновлении статуса задачи');
    } finally {
      setLoading(false);
    }
  };

  const renderTaskDetails = () => (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1.1rem' }}>
        Детали задачи
      </Typography>
      
      <Box sx={{ 
        p: 2, 
        borderRadius: 2, 
        bgcolor: alpha(theme.palette.primary.main, 0.05),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {task?.title}
          </Typography>
          <StatusBadge status={task?.status} />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {task?.description}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {task?.address && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                Адрес:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {task.address}
              </Typography>
            </Box>
          )}
          
          {task?.assigned_to_name && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                Сотрудник:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {task.assigned_to_name}
                {task.assigned_to_username && ` (@${task.assigned_to_username})`}
              </Typography>
            </Box>
          )}
          
          {task?.start_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                Начало:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(new Date(task.start_date))}
              </Typography>
            </Box>
          )}
          
          {task?.end_date && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                Дедлайн:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(new Date(task.end_date))}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  const renderCompletionReport = () => {
    // Проверяем, есть ли отчет о выполнении
    if (!task?.completion_report) {
      return null;
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1.1rem' }}>
          Отчет о выполнении
        </Typography>
        
        <Box sx={{ 
          p: 2, 
          borderRadius: 2, 
          bgcolor: alpha(theme.palette.success.main, 0.05),
          border: `1px solid ${alpha(theme.palette.success.main, 0.1)}`
        }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {task.completion_report.result}
          </Typography>
          
          {task.completion_report.completed_at && (
            <Typography variant="caption" color="text.secondary">
              Выполнено: {formatDate(new Date(task.completion_report.completed_at))}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderPhotos = () => {
    // Проверяем, есть ли фотографии
    if (!task?.completion_report?.photos || task.completion_report.photos.length === 0) {
      return null;
    }

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '1.1rem' }}>
          Фотографии
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1,
          p: 2, 
          borderRadius: 2, 
          bgcolor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`
        }}>
          {task.completion_report.photos.map((photo, index) => (
            <Box
              key={index}
              sx={{
                width: 100,
                height: 100,
                borderRadius: 1,
                overflow: 'hidden',
                border: `2px solid ${alpha(theme.palette.info.main, 0.3)}`,
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.05)',
                  border: `2px solid ${theme.palette.info.main}`,
                },
              }}
              onClick={() => handleImageClick(photo.url || photo)}
            >
              <img
                src={photo.url || photo}
                alt={`Фото ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: alpha(theme.palette.common.black, 0.7),
                  color: 'white',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                }}
              >
                <ImageIcon sx={{ fontSize: 14 }} />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="md"
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
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Подтверждение выполнения задачи
        </Typography>
        <IconButton onClick={handleClose} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {renderTaskDetails()}
        <Divider sx={{ my: 2 }} />
        {renderCompletionReport()}
        {renderPhotos()}

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
          variant="outlined"
          color="warning"
          onClick={() => handleConfirm('needsRevision')}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          sx={{ borderRadius: 2 }}
        >
          На доработку
        </Button>
        
        <Button
          variant="contained"
          color="success"
          onClick={() => handleConfirm('done')}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          sx={{ 
            borderRadius: 2,
            background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
            },
          }}
        >
          Принять
        </Button>
      </DialogActions>
    </Dialog>

    {/* Modal для просмотра изображений */}
    <Modal
      open={!!selectedImage}
      onClose={handleImageModalClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          overflow: 'hidden',
        }}
      >
        <IconButton
          onClick={handleImageModalClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            bgcolor: alpha(theme.palette.common.black, 0.7),
            color: 'white',
            zIndex: 1,
            '&:hover': {
              bgcolor: alpha(theme.palette.common.black, 0.9),
            },
          }}
        >
          <CloseIcon />
        </IconButton>
        <img
          src={selectedImage}
          alt="Увеличенное изображение"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            maxWidth: '90vw',
            maxHeight: '90vh',
          }}
        />
      </Box>
    </Modal>
    </>
  );
};

export default TaskConfirmationModal; 