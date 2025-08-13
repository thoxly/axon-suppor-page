import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Avatar,
  Typography,
  Divider,
  Chip,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { api } from '../../utils/api';
import useAuth from '../../hooks/useAuth';

const ProfileModal = ({ open, onClose }) => {
  const { user } = useAuth();
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && user?.company_id) {
      fetchCompanyData();
    }
  }, [open, user?.company_id]);

  const fetchCompanyData = async () => {
    if (!user?.company_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.company.getById(user.company_id);
      setCompanyData(data);
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Не удалось загрузить данные о компании');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return 'Не указано';
    return time.substring(0, 5); // Возвращаем только часы и минуты
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'manager':
        return 'Менеджер';
      case 'employee':
        return 'Сотрудник';
      default:
        return role;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'manager':
        return 'primary';
      case 'employee':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 48,
              height: 48,
              backgroundColor: 'primary.main',
            }}
          >
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" component="div">
              {user?.full_name || 'Пользователь'}
            </Typography>
            <Chip
              label={getRoleLabel(user?.role)}
              color={getRoleColor(user?.role)}
              size="small"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Информация о пользователе */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <PersonIcon />
            Информация о пользователе
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {user?.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  Email:
                </Typography>
                <Typography variant="body2">
                  {user.email}
                </Typography>
              </Box>
            )}
            
            {user?.telegram_id && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  Telegram ID:
                </Typography>
                <Typography variant="body2">
                  {user.telegram_id}
                </Typography>
              </Box>
            )}
            
            {user?.username && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  Username:
                </Typography>
                <Typography variant="body2">
                  @{user.username}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Информация о компании */}
        <Box>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BusinessIcon />
            Информация о компании
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="80%" />
            </Box>
          ) : companyData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary">
                  Название:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {companyData.name}
                </Typography>
              </Box>

              {companyData.inn && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    ИНН:
                  </Typography>
                  <Typography variant="body2">
                    {companyData.inn}
                  </Typography>
                </Box>
              )}

              {companyData.address && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    Адрес:
                  </Typography>
                  <Typography variant="body2">
                    {companyData.address}
                  </Typography>
                </Box>
              )}

              {(companyData.work_start_time || companyData.work_end_time) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    Рабочее время:
                  </Typography>
                  <Typography variant="body2">
                    {formatTime(companyData.work_start_time)} - {formatTime(companyData.work_end_time)}
                  </Typography>
                </Box>
              )}

              {(companyData.lunch_break_start || companyData.lunch_break_end) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="body2" color="text.secondary">
                    Обед:
                  </Typography>
                  <Typography variant="body2">
                    {formatTime(companyData.lunch_break_start)} - {formatTime(companyData.lunch_break_end)}
                  </Typography>
                </Box>
              )}

              {companyData.comment && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Комментарий:
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    backgroundColor: 'background.paper', 
                    p: 1, 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    {companyData.comment}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {user?.company_id ? 'Не удалось загрузить данные о компании' : 'Компания не привязана'}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined">
          Закрыть
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileModal; 