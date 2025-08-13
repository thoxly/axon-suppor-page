import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  alpha,
  useTheme,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const LocationInstructionModal = ({ open, onClose, onRetry }) => {
  const theme = useTheme();

  const steps = [
    {
      icon: <SettingsIcon color="primary" />,
      title: 'Откройте настройки Telegram',
      description: 'Нажмите на кнопку меню (☰) в Telegram'
    },
    {
      icon: <SecurityIcon color="primary" />,
      title: 'Перейдите в настройки',
      description: 'Выберите "Настройки" → "Конфиденциальность и безопасность"'
    },
    {
      icon: <LocationIcon color="primary" />,
      title: 'Найдите настройки геолокации',
      description: 'Прокрутите вниз и найдите "Геолокация"'
    },
    {
      icon: <CheckCircleIcon color="success" />,
      title: 'Включите передачу геолокации',
      description: 'Убедитесь, что передача геолокации включена для этого бота'
    }
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }
      }}
    >
      <DialogTitle sx={{ 
        textAlign: 'center', 
        pb: 1,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`
      }}>
        <Box display="flex" alignItems="center" justifyContent="center" mb={1}>
          <LocationIcon sx={{ mr: 1, fontSize: 28, color: theme.palette.primary.main }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Включите передачу геолокации
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Для начала работы необходимо делиться своей локацией
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mb: 3,
            background: alpha(theme.palette.info.main, 0.08),
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            borderRadius: 2
          }}
        >
          <Typography variant="body2" color="info.main" sx={{ fontWeight: 500 }}>
            📱 Передача геолокации необходима для отслеживания времени работы и обеспечения безопасности
          </Typography>
        </Paper>

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: theme.palette.text.primary }}>
          Пошаговая инструкция:
        </Typography>

        <List sx={{ pt: 0 }}>
          {steps.map((step, index) => (
            <ListItem 
              key={index} 
              sx={{ 
                px: 0, 
                py: 1.5,
                borderBottom: index < steps.length - 1 ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Box 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: '50%', 
                    background: alpha(theme.palette.primary.main, 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 1
                  }}
                >
                  {step.icon}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {step.title}
                  </Typography>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            mt: 3,
            background: alpha(theme.palette.success.main, 0.08),
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            borderRadius: 2
          }}
        >
          <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
            ✅ После включения геолокации нажмите "Проверить снова"
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3
          }}
        >
          Закрыть
        </Button>
        <Button 
          onClick={onRetry} 
          variant="contained"
          startIcon={<RefreshIcon />}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            '&:hover': {
              background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
            }
          }}
        >
          Проверить снова
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LocationInstructionModal; 