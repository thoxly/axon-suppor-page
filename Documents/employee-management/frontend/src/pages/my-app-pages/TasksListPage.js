import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  alpha,
  useTheme,
  Grid,
  Card,
  CardContent,
  Fade,
  Slide,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import TaskCard from '../../components/MyApp/TaskCard';
import TaskCategoryCard from '../../components/MyApp/TaskCategoryCard';
import MapView from '../../components/MyApp/MapView';
import CardSkeleton from '../../components/common/CardSkeleton';
import { useAuthContext } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { getTelegramUser, triggerHapticSelection } from '../../utils/telegram';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fromDatabase, DEFAULT_COORDINATES } from '../../utils/coordinates';

const TasksListPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthContext();
  const [selectedCategory, setSelectedCategory] = useState('my');
  
  console.log('TasksListPage - render - selectedCategory:', selectedCategory);
  console.log('TasksListPage - render - searchParams:', searchParams.toString());
  const [tasks, setTasks] = useState({ assigned: [], free: [] });
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDINATES);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [showMapView, setShowMapView] = useState(true);
  const [hasActiveLocationSession, setHasActiveLocationSession] = useState(false);

  // Функция для проверки активной сессии локации
  const checkActiveLocationSession = async (telegramUser) => {
    try {
      const sessionResponse = await api.sessions.getActiveSession(telegramUser.id);
      setHasActiveLocationSession(sessionResponse.hasActiveSession);
      return sessionResponse.hasActiveSession;
    } catch (error) {
      console.error('Failed to check active location session:', error);
      setHasActiveLocationSession(false);
      return false;
    }
  };

  // Функция для получения реальной позиции пользователя
  const fetchCurrentPosition = async (telegramUser) => {
    try {
      const positionResponse = await api.sessions.getCurrentPosition(telegramUser.id);
      
      if (positionResponse.hasPosition && positionResponse.position) {
        const realLocation = fromDatabase(positionResponse.position);
        console.log('📍 TasksListPage - Real position received:', realLocation);
        setCurrentLocation(realLocation);
        return realLocation;
      } else {
        console.log('📍 TasksListPage - No real position available, using default');
        return null;
      }
    } catch (error) {
      console.error('Failed to fetch current position:', error);
      return null;
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

  // Устанавливаем категорию из URL параметров при загрузке
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    console.log('TasksListPage - useEffect - categoryFromUrl:', categoryFromUrl);
    if (categoryFromUrl && ['my', 'free', 'completed'].includes(categoryFromUrl)) {
      console.log('TasksListPage - setting selectedCategory to:', categoryFromUrl);
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const telegramUser = getTelegramUser();
      if (!telegramUser) {
        throw new Error('Не удалось получить данные пользователя Telegram');
      }

      const tasksResponse = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(tasksResponse);

      // Проверяем активную сессию локации
      await checkActiveLocationSession(telegramUser);

      // Получаем реальную позицию пользователя
      await fetchCurrentPosition(telegramUser);

    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Не удалось загрузить задачи');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  // Эффект для периодического обновления позиции
  useEffect(() => {
    if (!hasActiveLocationSession) return;

    const updatePosition = async () => {
      try {
        const telegramUser = getTelegramUser();
        if (!telegramUser) return;

        await fetchCurrentPosition(telegramUser);
      } catch (error) {
        console.error('Failed to update position:', error);
      }
    };

    // Обновляем позицию каждые 10 секунд если есть активная сессия
    const interval = setInterval(updatePosition, 10000);

    return () => clearInterval(interval);
  }, [hasActiveLocationSession]);

  // Разделяем задачи по категориям
  const myTasks = tasks.assigned.filter(task => task.status === 'assigned' || task.status === 'accepted');
  const freeTasks = tasks.free;
  const completedTasks = tasks.assigned.filter(task => task.status === 'completed');
  
  console.log('TasksListPage - tasks breakdown:');
  console.log('  - assigned tasks:', tasks.assigned.length);
  console.log('  - free tasks:', tasks.free.length);
  console.log('  - myTasks:', myTasks.length);
  console.log('  - freeTasks:', freeTasks.length);
  console.log('  - completedTasks:', completedTasks.length);

  const renderTaskList = (tasksList, isAssigned = true) => (
    <Box>
      {tasksList.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          isAssigned={isAssigned}
          isExpanded={expandedTasks.has(task.id)}
          onExpand={handleTaskExpand}
          onAcceptAssigned={handleAcceptAssigned}
          onTakeFree={handleTakeFree}
          onStartWork={handleStartWork}
          onCompleteWork={handleCompleteWork}
          hasTaskInProgress={false}
          inProgressTask={null}
          showMap={false}
          targetLocation={null}
          currentLocation={currentLocation}
          route={[]}
          telegramId={getTelegramUser()?.id}
        />
      ))}
    </Box>
  );

  const handleTaskExpand = (taskId) => {
    triggerHapticSelection();
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const handleAcceptAssigned = async (taskId, event) => {
    event.stopPropagation();
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.acceptAssigned(taskId, telegramUser.id);
      
      // Обновляем список задач
      const response = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(response);
      
      // Переходим к задаче с передачей категории
      navigate(`/my-app/task-details/${taskId}?category=${selectedCategory}`);
      
    } catch (err) {
      console.error('Failed to accept task:', err);
      setError(err.message || 'Ошибка при принятии задачи');
    }
  };

  const handleTakeFree = async (taskId, event) => {
    event.stopPropagation();
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.takeFree(taskId, telegramUser.id);
      
      // Обновляем список задач
      const response = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(response);
      
      // Переходим к задаче с передачей категории
      navigate(`/my-app/task-details/${taskId}?category=${selectedCategory}`);
      
    } catch (err) {
      console.error('Failed to take task:', err);
      setError(err.message || 'Ошибка при взятии задачи');
    }
  };

  const handleStartWork = async (taskId, event) => {
    event.stopPropagation();
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.startWork(taskId, telegramUser.id);
      
      // Перенаправляем на страницу текущей задачи
      navigate('/my-app/current-task');
      
    } catch (err) {
      console.error('Failed to start work:', err);
      setError(err.message || 'Ошибка при начале работы');
    }
  };

  const handleCompleteWork = async (taskId, event, updatedTask = null) => {
    if (event) {
      event.stopPropagation();
    }
    
    if (updatedTask) {
      // Если задача была обновлена (завершена), обновляем список задач
      setTasks(prevTasks => {
        const newAssigned = prevTasks.assigned.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        );
        return { ...prevTasks, assigned: newAssigned };
      });
    } else {
      // Переходим к задаче для завершения с передачей категории
      navigate(`/my-app/task-details/${taskId}?category=${selectedCategory}`);
    }
  };

  const handleTaskCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleTaskClick = (clickedTask) => {
    // Переходим к выбранной задаче на новой странице деталей
    // Передаем информацию о категории для правильного возврата
    console.log('TasksListPage - handleTaskClick - selectedCategory:', selectedCategory);
    navigate(`/my-app/task-details/${clickedTask.id}?category=${selectedCategory}`);
  };

  const handleTaskAccept = async (taskId, event) => {
    event.stopPropagation();
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.takeFree(taskId, telegramUser.id);
      
      // Обновляем список задач
      await fetchTasks();
      
      // Показываем уведомление об успехе
      triggerHapticSelection();
      
    } catch (err) {
      console.error('Failed to accept task:', err);
      setError(err.message || 'Ошибка при принятии задачи');
    }
  };

  const handleTaskAcknowledge = async (taskId, event) => {
    event.stopPropagation();
    try {
      const telegramUser = getTelegramUser();
      await api.tasks.acceptAssigned(taskId, telegramUser.id);
      
      // Обновляем список задач
      await fetchTasks();
      
      // Показываем уведомление об успехе
      triggerHapticSelection();
      
    } catch (err) {
      console.error('Failed to acknowledge task:', err);
      setError(err.message || 'Ошибка при подтверждении ознакомления');
    }
  };

  const handleCategoryChange = (category) => {
    console.log('TasksListPage - handleCategoryChange - category:', category);
    setSelectedCategory(category);
    // Обновляем URL с новой категорией
    navigate(`/my-app?category=${category}`, { replace: true });
  };

  const renderCategoryCards = () => (
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={4}>
        <Box sx={{ height: '60px' }}>
          <TaskCategoryCard
            title="Мои задачи"
            count={myTasks.length}
            onClick={() => handleCategoryChange('my')}
            isActive={selectedCategory === 'my'}
          />
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box sx={{ height: '60px' }}>
          <TaskCategoryCard
            title="Свободные задачи"
            count={freeTasks.length}
            onClick={() => handleCategoryChange('free')}
            isActive={selectedCategory === 'free'}
          />
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Box sx={{ height: '60px' }}>
          <TaskCategoryCard
            title="Завершенные"
            count={completedTasks.length}
            onClick={() => handleCategoryChange('completed')}
            isActive={selectedCategory === 'completed'}
          />
        </Box>
      </Grid>
    </Grid>
  );

  const renderSelectedCategory = () => {
    console.log('TasksListPage - renderSelectedCategory - CALLED');
    if (!selectedCategory) {
      console.log('TasksListPage - renderSelectedCategory - no selectedCategory, returning null');
      return null;
    }

    console.log('TasksListPage - renderSelectedCategory - selectedCategory:', selectedCategory);
    console.log('TasksListPage - renderSelectedCategory - myTasks count:', myTasks.length);
    console.log('TasksListPage - renderSelectedCategory - freeTasks count:', freeTasks.length);
    console.log('TasksListPage - renderSelectedCategory - completedTasks count:', completedTasks.length);

    let title, tasks, emptyMessage, isAssigned;

    switch (selectedCategory) {
      case 'free':
        title = 'Свободные задачи';
        tasks = freeTasks;
        emptyMessage = 'Нет доступных свободных задач';
        isAssigned = false;
        break;
      case 'my':
        title = 'Мои задачи';
        tasks = myTasks;
        emptyMessage = 'У вас нет назначенных задач';
        isAssigned = true;
        break;
      case 'completed':
        title = 'Завершенные задачи';
        tasks = completedTasks;
        emptyMessage = 'Нет завершенных задач';
        isAssigned = true;
        break;
      default:
        return null;
    }

    console.log('TasksListPage - renderSelectedCategory - selected title:', title);
    console.log('TasksListPage - renderSelectedCategory - selected tasks count:', tasks.length);

    return (
      <Box sx={{ mt: 2 }}>
        <Typography 
          variant="h6" 
          component="h2" 
          sx={{ 
            mb: 2,
            color: theme.palette.text.primary,
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.1rem',
            letterSpacing: '-0.01em',
            position: 'relative',
            opacity: 0.9,
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 30,
              height: 2,
              borderRadius: '1px',
              background: `linear-gradient(90deg, ${alpha(theme.palette.secondary.main, 0.5)} 0%, ${alpha(theme.palette.primary.main, 0.5)} 100%)`,
            }
          }}
        >
          {title}
        </Typography>
        
        {tasks.length === 0 ? (
          <Alert 
            severity="info" 
            sx={{ 
              borderRadius: '12px',
              background: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              '& .MuiAlert-icon': {
                color: theme.palette.info.main
              }
            }}
          >
            {emptyMessage}
          </Alert>
        ) : (
          <Box sx={{ maxHeight: '150px', overflowY: 'auto' }}>
            {renderTaskList(tasks, isAssigned)}
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ height: `${viewportHeight}px`, position: 'relative', overflow: 'hidden' }}>
        {/* Settings button skeleton */}
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1200,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: 'blur(10px)',
          }}
        />
        
        {/* Category cards skeleton */}
        <Box sx={{ p: 2, pt: 4 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[1, 2, 3].map((index) => (
              <Grid item xs={4} key={index}>
                <Box sx={{ height: '60px' }}>
                  <CardSkeleton showActions={false} />
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Task cards skeleton */}
        <Box sx={{ p: 2 }}>
          {[1, 2, 3].map((index) => (
            <CardSkeleton key={index} showMap={false} />
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ height: `${viewportHeight}px`, position: 'relative', overflow: 'hidden' }}>
      {/* Settings button */}
      <IconButton
        onClick={() => navigate('/my-app/settings')}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1200,
          background: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          '&:hover': {
            background: alpha(theme.palette.background.paper, 0.7),
          }
        }}
      >
        <SettingsIcon />
      </IconButton>

      {/* Map with task controls */}
      <MapView
        currentTask={null}
        showMap={true}
        targetLocation={null}
        currentLocation={currentLocation}
        route={[]}
        onStartWork={handleStartWork}
        onCompleteWork={handleCompleteWork}
        viewportHeight={viewportHeight}
        hasActiveLocationSession={hasActiveLocationSession}
        myTasks={myTasks}
        freeTasks={freeTasks}
        completedTasks={completedTasks}
        onTaskCategoryClick={handleTaskCategoryClick}
        onTaskClick={handleTaskClick}
        onTaskAccept={handleTaskAccept}
        onTaskAcknowledge={handleTaskAcknowledge}
        selectedCategory={selectedCategory}
        telegramId={getTelegramUser()?.id}
      />
    </Box>
  );
};

export default TasksListPage; 