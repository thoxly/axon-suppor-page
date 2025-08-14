import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Button,
  Chip,
  Paper,
  IconButton,
  alpha,
  useTheme,
  CircularProgress,
  Fade,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { getTelegramUser, triggerHapticFeedback } from '../../utils/telegram';
import { formatDate } from '../../utils/dateUtils';
import { fromDatabase, DEFAULT_COORDINATES } from '../../utils/coordinates';
import StatusBadge, { statusLabels } from '../../components/common/StatusBadge';
import TelegramYandexMap from '../../components/Map/TelegramYandexMap';
import TaskCompletionModal from '../../components/MyApp/TaskCompletionModal';

const CurrentTaskPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [hasActiveLocationSession, setHasActiveLocationSession] = useState(false);
  const [isTaskCompletionModalOpen, setIsTaskCompletionModalOpen] = useState(false);
  const [routePoints, setRoutePoints] = useState([]); // Добавляем состояние для точек маршрута
  const [activeSession, setActiveSession] = useState(null);

  // Функция для получения истории местоположений
  const fetchRoutePoints = async (telegramUser, sessionId) => {
    try {
      // Получаем позиции только для текущей сессии
      const positions = await api.sessions.getUserPositions(telegramUser.id, 100, sessionId);
      if (positions && positions.length > 0) {
        const points = positions.map(pos => fromDatabase(pos));
        setRoutePoints(points);
        // Устанавливаем последнюю известную позицию как текущую
        setCurrentLocation(points[0]); // positions отсортированы по убыванию времени
      }
    } catch (error) {
      console.error('Failed to fetch route points:', error);
    }
  };

  // Функция для проверки активной сессии локации
  const checkActiveLocationSession = async (telegramUser) => {
    try {
      const sessionResponse = await api.sessions.getActiveSession(telegramUser.id);
      const hasActiveSession = sessionResponse.hasActiveSession;
      setHasActiveLocationSession(hasActiveSession);
      setActiveSession(sessionResponse.session);
      return { hasActiveSession, session: sessionResponse.session };
    } catch (error) {
      console.error('Failed to check active location session:', error);
      setHasActiveLocationSession(false);
      setActiveSession(null);
      return { hasActiveSession: false, session: null };
    }
  };

  // Функция для получения текущей позиции
  const fetchCurrentPosition = async (telegramUser) => {
    try {
      const positionResponse = await api.sessions.getCurrentPosition(telegramUser.id);
      if (positionResponse?.position) {
        const coords = fromDatabase(positionResponse.position);
        if (coords) {
          setCurrentLocation(coords);
        }
      }
    } catch (error) {
      console.error('Failed to fetch current position:', error);
    }
  };

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      setViewportHeight(tg.viewportHeight || window.innerHeight);
    }

    const handleResize = () => {
      if (window.Telegram?.WebApp) {
        setViewportHeight(window.Telegram.WebApp.viewportHeight || window.innerHeight);
      } else {
        setViewportHeight(window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCurrentTask = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const telegramUser = getTelegramUser();
        if (!telegramUser) {
          throw new Error('Не удалось получить данные пользователя Telegram');
        }

        // Быстрая проверка на наличие текущей задачи
        console.log('Checking for current task...');

        // Загружаем все задачи
        const tasksResponse = await api.tasks.getForMiniApp(telegramUser.id);
        
        // Ищем задачу в работе
        const currentTask = tasksResponse.assigned.find(t => t.status === 'in-progress');
        
        if (!currentTask) {
          // Если нет задачи в работе, перенаправляем на карту миниприложения
          console.log('No current task found, redirecting to /my-app');
          navigate('/my-app', { replace: true });
          return;
        }

        setTask(currentTask);

        // Проверяем активную сессию локации
        const { hasActiveSession, session } = await checkActiveLocationSession(telegramUser);
        
        // Если есть активная сессия:
        if (hasActiveSession && session) {
          // 1. Получаем историю маршрута для текущей сессии
          await fetchRoutePoints(telegramUser, session.id);
          // 2. Получаем текущую позицию
          await fetchCurrentPosition(telegramUser);
        }

        console.log('Current task loaded successfully:', currentTask.title);

      } catch (err) {
        console.error('Failed to fetch current task:', err);
        setError(err.message || 'Не удалось загрузить текущую задачу');
        
        // Если произошла ошибка при загрузке задач, перенаправляем на карту
        console.log('Error occurred, redirecting to /my-app');
        navigate('/my-app', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchCurrentTask();
    } else {
      // Если пользователь не аутентифицирован, перенаправляем на карту
      console.log('User not authenticated, redirecting to /my-app');
      navigate('/my-app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Добавляем эффект для периодического обновления маршрута и текущей позиции
  useEffect(() => {
    if (!hasActiveLocationSession || !activeSession) return;

    const telegramUser = getTelegramUser();
    if (!telegramUser) return;

    // Обновляем маршрут и текущую позицию каждые 30 секунд
    const interval = setInterval(async () => {
      await fetchRoutePoints(telegramUser, activeSession.id);
      await fetchCurrentPosition(telegramUser);
    }, 30000);

    return () => clearInterval(interval);
  }, [hasActiveLocationSession, activeSession]);

  // Эффект для автоматического перенаправления, если нет задачи
  useEffect(() => {
    if (!loading && !task && !error) {
      const timer = setTimeout(() => {
        console.log('Auto-redirecting to /my-app due to no task');
        navigate('/my-app', { replace: true });
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [loading, task, error, navigate]);

  const handleCompleteWork = async () => {
    try {
      triggerHapticFeedback('medium');
      setIsTaskCompletionModalOpen(true);
    } catch (err) {
      console.error('Failed to open completion modal:', err);
      setError(err.message || 'Ошибка при открытии формы завершения');
    }
  };

  const handleCancelTask = async () => {
    try {
      triggerHapticFeedback('medium');
      
      const telegramUser = getTelegramUser();
      if (!telegramUser) {
        throw new Error('Не удалось получить данные пользователя Telegram');
      }

      // Изменяем статус задачи с in-progress на accepted
      await api.tasks.updateStatus(task.id, 'accepted', telegramUser.id);
      
      // Перенаправляем обратно к списку задач
      navigate('/my-app');
    } catch (err) {
      console.error('Failed to cancel task:', err);
      setError(err.message || 'Ошибка при отмене задачи');
    }
  };


  const handleTaskCompleted = async (updatedTask) => {
    try {
      // Перенаправляем обратно к списку задач
      navigate('/my-app');
    } catch (err) {
      console.error('Failed to handle task completion:', err);
      setError(err.message || 'Ошибка при завершении задачи');
    }
  };

  const handleBack = () => {
    navigate('/my-app');
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          height: `${viewportHeight}px`,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'background.default'
        }}
      >
        {/* Header skeleton */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            padding: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              p: 2,
              mb: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box flex={1}>
                <Skeleton variant="text" width="70%" height={24} />
              </Box>
            </Box>

            {/* Task info skeleton */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
              
              <Box display="flex" alignItems="center" mb={1}>
                <Skeleton variant="circular" width={16} height={16} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="80%" height={16} />
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Map skeleton */}
        <Box sx={{ height: '100%', pt: 120 }}>
          <Skeleton variant="rounded" width="100%" height="100%" />
        </Box>

        {/* Bottom action skeleton */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            padding: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="rounded" width="100%" height={48} />
            </Box>
          </Paper>
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert 
          severity="info" 
          sx={{ borderRadius: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => navigate('/my-app')}
            >
              На карту
            </Button>
          }
        >
          Нет активных задач. Перенаправляем на карту через 3 секунды...
        </Alert>
      </Container>
    );
  }

  // Определяем координаты задачи (можно расширить логику)
  const taskLocation = currentLocation;

  // Если нет активной локации, не показываем карту
  if (!hasActiveLocationSession || !currentLocation) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Для отслеживания выполнения задачи необходимо поделиться live-локацией через Telegram
        </Alert>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        height: `${viewportHeight}px`,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}
    >
      {/* Header */}
      <Fade in timeout={800}>
        <Box
          sx={{
            position: 'absolute',
            top: '2%',
            left: 0,
            right: 0,
            zIndex: 1000,
            padding: 2,
          }}
        >
          {/* Полупрозрачная панель с размытием */}
          <Paper
            elevation={0}
            sx={{
              background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.85)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              p: 2,
              mb: 2,
            }}
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Box flex={1}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                  {hasActiveLocationSession ? 'Текущая задача' : 'Ваше положение известно'}
                </Typography>
              </Box>
            </Box>

            {/* Task info */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                  {task.title}
                </Typography>
                <StatusBadge status={task.status} />
              </Box>
              
              <Box display="flex" alignItems="center" mb={1}>
                <LocationIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                  {task.company_address || task.company?.name || 'Адрес не указан'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Fade>

      {/* Map */}
      <Box sx={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        filter: hasActiveLocationSession ? 'none' : 'grayscale(100%) brightness(0.7)',
        transition: 'filter 0.3s ease-in-out',
      }}>
        <TelegramYandexMap 
          points={[
            { 
              coordinates: taskLocation,
              description: task.company_address || task.company?.name
            }
          ]}
          center={currentLocation}
          route={routePoints} // Передаем точки маршрута
          zoom={15}
          height="100%"
          showActiveLocation={hasActiveLocationSession}
        />
      </Box>

      {/* Bottom controls */}
      {task.status === 'in-progress' && (
        <Fade in timeout={1000}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 40,
              left: 16,
              right: 16,
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handleCompleteWork}
              fullWidth
              sx={{ 
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                py: 2,
                fontSize: '1.1rem',
                background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.success.dark}, ${theme.palette.success.main})`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px -5px ${alpha(theme.palette.success.main, 0.4)}`,
                },
                transition: 'all 0.3s ease-in-out',
                boxShadow: `0 4px 15px -3px ${alpha(theme.palette.success.main, 0.3)}`,
              }}
            >
              Завершить задачу
            </Button>
            
            <Button
              variant="contained"
              color="error"
              startIcon={<CancelIcon />}
              onClick={handleCancelTask}
              fullWidth
              sx={{ 
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 600,
                py: 2,
                fontSize: '1.1rem',
                background: `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.error.dark}, ${theme.palette.error.main})`,
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 25px -5px ${alpha(theme.palette.error.main, 0.4)}`,
                },
                transition: 'all 0.3s ease-in-out',
                boxShadow: `0 4px 15px -3px ${alpha(theme.palette.error.main, 0.3)}`,
              }}
            >
              Отменить
            </Button>
          </Box>
        </Fade>
      )}



      {/* Модальное окно завершения задачи */}
      <TaskCompletionModal
        open={isTaskCompletionModalOpen}
        onClose={() => setIsTaskCompletionModalOpen(false)}
        task={task}
        onTaskCompleted={handleTaskCompleted}
        telegramId={getTelegramUser()?.id}
      />
    </Box>
  );
};

export default CurrentTaskPage; 