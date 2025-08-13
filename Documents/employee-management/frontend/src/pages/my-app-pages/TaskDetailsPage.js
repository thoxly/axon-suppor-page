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
  Divider,
  alpha,
  useTheme,
  CircularProgress,
  Skeleton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  LocationOn as LocationIcon,
  Assignment as TasksIcon,
  CheckCircleOutline as CompletedIcon,
  Add as FreeIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { getTelegramUser, triggerHapticFeedback } from '../../utils/telegram';
import { formatDate } from '../../utils/dateUtils';
import StatusBadge, { statusLabels } from '../../components/common/StatusBadge';
import TaskCompletionModal from '../../components/MyApp/TaskCompletionModal';

const TaskDetailsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthContext();
  
  // Отладочная информация при загрузке
  useEffect(() => {
    console.log('TaskDetailsPage - mounted - taskId:', taskId);
    console.log('TaskDetailsPage - mounted - searchParams:', searchParams.toString());
    console.log('TaskDetailsPage - mounted - category from URL:', searchParams.get('category'));
  }, [taskId, searchParams]);
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState({ assigned: [], free: [] });
  const [isTaskCompletionModalOpen, setIsTaskCompletionModalOpen] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const telegramUser = getTelegramUser();
        if (!telegramUser) {
          throw new Error('Не удалось получить данные пользователя Telegram');
        }

        // Загружаем все задачи
        const tasksResponse = await api.tasks.getForMiniApp(telegramUser.id);
        setTasks(tasksResponse);
        
        // Находим текущую задачу
        const currentTask = tasksResponse.assigned.find(t => t.id === parseInt(taskId)) ||
                           tasksResponse.free.find(t => t.id === parseInt(taskId));
        
        if (!currentTask) {
          throw new Error('Задача не найдена');
        }

        setTask(currentTask);

      } catch (err) {
        console.error('Failed to fetch task:', err);
        setError(err.message || 'Не удалось загрузить задачу');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && taskId) {
      fetchTask();
    }
  }, [isAuthenticated, taskId]);

  const handleStartWork = async (taskId, event) => {
    try {
      triggerHapticFeedback('medium');
      const telegramUser = getTelegramUser();
      
      await api.tasks.startWork(taskId, telegramUser.id);
      
      // Перенаправляем на страницу текущей задачи
      navigate('/my-app/current-task');
      
    } catch (err) {
      console.error('Failed to start work:', err);
      setError(err.message || 'Ошибка при начале работы');
    }
  };

  const handleCompleteWork = async (taskId, event) => {
    try {
      triggerHapticFeedback('medium');
      setIsTaskCompletionModalOpen(true);
    } catch (err) {
      console.error('Failed to open completion modal:', err);
      setError(err.message || 'Ошибка при открытии формы завершения');
    }
  };

  const handleTaskCompleted = async (updatedTask) => {
    try {
      // Перенаправляем обратно к списку задач в соответствующую категорию
      const category = searchParams.get('category');
      if (category === 'free') {
        navigate('/my-app?category=free');
      } else if (category === 'completed') {
        navigate('/my-app?category=completed');
      } else {
        navigate('/my-app?category=my');
      }
    } catch (err) {
      console.error('Failed to handle task completion:', err);
      setError(err.message || 'Ошибка при завершении задачи');
    }
  };

  const handleAcceptAssigned = async (taskId, event) => {
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.acceptAssigned(taskId, telegramUser.id);
      
      // Обновляем статус задачи
      setTask(prev => ({ ...prev, status: 'accepted' }));
      
    } catch (err) {
      console.error('Failed to accept task:', err);
      setError(err.message || 'Ошибка при принятии задачи');
    }
  };

  const handleTakeFree = async (taskId, event) => {
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.takeFree(taskId, telegramUser.id);
      
      // Обновляем статус задачи
      setTask(prev => ({ ...prev, status: 'accepted' }));
      
    } catch (err) {
      console.error('Failed to take task:', err);
      setError(err.message || 'Ошибка при взятии задачи');
    }
  };

  const handleBack = () => {
    // Получаем категорию из URL параметров
    const category = searchParams.get('category');
    console.log('TaskDetailsPage - handleBack - category from URL:', category);
    
    // Возвращаемся в соответствующий раздел
    if (category === 'free') {
      console.log('Navigating to free tasks');
      navigate('/my-app?category=free');
    } else if (category === 'completed') {
      console.log('Navigating to completed tasks');
      navigate('/my-app?category=completed');
    } else {
      // По умолчанию возвращаемся в "Мои задачи"
      console.log('Navigating to my tasks (default)');
      navigate('/my-app?category=my');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned':
      case 'accepted':
        return <TasksIcon />;
      case 'in-progress':
        return <PlayArrowIcon />;
      case 'completed':
        return <CompletedIcon />;
      case 'free':
      case 'not-assigned':
        return <FreeIcon />;
      default:
        return <TasksIcon />;
    }
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh',
          bgcolor: 'background.default',
          pb: 4
        }}
      >
        {/* Header skeleton */}
        <Paper 
          elevation={0}
          sx={{ 
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            bgcolor: 'background.paper'
          }}
        >
          <Container maxWidth="sm">
            <Box display="flex" alignItems="center" gap={2} py={2}>
              <Skeleton variant="circular" width={40} height={40} />
              <Skeleton variant="text" width={150} height={24} />
            </Box>
          </Container>
        </Paper>

        <Container maxWidth="sm" sx={{ py: 3 }}>
          {/* Task Card skeleton */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 3,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              bgcolor: 'background.paper',
              mb: 3
            }}
          >
            {/* Task Header skeleton */}
            <Box display="flex" alignItems="center" gap={2} mb={3}>
              <Skeleton variant="rounded" width={48} height={48} />
              <Box flex={1}>
                <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="rounded" width={80} height={24} />
              </Box>
            </Box>

            {/* Task Info skeleton */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="70%" height={20} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="60%" height={20} />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Skeleton variant="circular" width={20} height={20} sx={{ mr: 1 }} />
                <Skeleton variant="text" width="50%" height={20} />
              </Box>
            </Box>

            {/* Description skeleton */}
            <Box sx={{ mb: 3 }}>
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="75%" height={20} />
            </Box>

            {/* Map skeleton */}
            <Box sx={{ mb: 3 }}>
              <Skeleton variant="rounded" width="100%" height={200} />
            </Box>

            {/* Action buttons skeleton */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="rounded" width={120} height={40} />
              <Skeleton variant="rounded" width={120} height={40} />
            </Box>
          </Paper>
        </Container>
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
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Задача не найдена
        </Alert>
      </Container>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        pb: 4
      }}
    >
      {/* Header */}
      <Paper 
        elevation={0}
        sx={{ 
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          bgcolor: 'background.paper'
        }}
      >
        <Container maxWidth="sm">
          <Box display="flex" alignItems="center" gap={2} py={2}>
            <IconButton
              onClick={handleBack}
              sx={{
                color: theme.palette.text.primary,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box flex={1}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Детали задачи
              </Typography>
            </Box>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {/* Task Card */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            bgcolor: 'background.paper',
            mb: 3
          }}
        >
          {/* Task Header */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            >
              {getStatusIcon(task.status)}
            </Box>
            
            <Box flex={1}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {task.title}
              </Typography>
              <StatusBadge status={task.status} />
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Task Details */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Информация о задаче
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Company */}
              {task.company && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
                    Компания
                  </Typography>
                  <Typography variant="body1">
                    {task.company.name}
                  </Typography>
                </Box>
              )}

              {/* Address */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
                  Адрес
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                  <Typography variant="body1">
                    {task.company_address || task.company?.name || 'Адрес не указан'}
                  </Typography>
                </Box>
              </Box>

              {/* Description */}
              {task.description && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
                    Описание
                  </Typography>
                  <Typography variant="body1">
                    {task.description}
                  </Typography>
                </Box>
              )}

              {/* Created Date */}
              {task.created_at && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
                    Дата создания
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(task.created_at)}
                  </Typography>
                </Box>
              )}

              {/* Due Date */}
              {task.due_date && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.text.secondary, mb: 0.5 }}>
                    Срок выполнения
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(task.due_date)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Accept Assigned Task */}
            {task.status === 'assigned' && (
              <Button
                variant="contained"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleAcceptAssigned(task.id)}
                fullWidth
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                Ознакомлен
              </Button>
            )}

            {/* Take Free Task */}
            {(task.status === 'free' || task.status === 'not-assigned') && (
              <Button
                variant="contained"
                startIcon={<FreeIcon />}
                onClick={() => handleTakeFree(task.id)}
                fullWidth
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                Взять задачу
              </Button>
            )}

            {/* Start Work */}
            {task.status === 'accepted' && (
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleStartWork(task.id)}
                fullWidth
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  fontSize: '1rem',
                }}
              >
                Начать работу
              </Button>
            )}

            {/* Complete Work */}
            {task.status === 'in-progress' && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => handleCompleteWork(task.id)}
                  fullWidth
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    fontSize: '1rem',
                    mb: 2,
                  }}
                >
                  Завершить задачу
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrowIcon />}
                  onClick={() => navigate('/my-app/current-task')}
                  fullWidth
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    py: 1.5,
                    fontSize: '1rem',
                    mb: 2,
                  }}
                >
                  Перейти к работе
                </Button>
              </>
            )}

            {/* Back Button */}
            <Button
              variant="outlined"
              onClick={handleBack}
              fullWidth
              sx={{ 
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                py: 1.5,
                fontSize: '1rem',
              }}
            >
              Назад к списку
            </Button>
          </Box>
        </Paper>
      </Container>

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

export default TaskDetailsPage; 