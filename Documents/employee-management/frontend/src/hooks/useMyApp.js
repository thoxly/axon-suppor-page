import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getTelegramUser, triggerHapticSelection, triggerHapticFeedback } from '../utils/telegram';
import { fromDatabase, DEFAULT_COORDINATES } from '../utils/coordinates';

export const useMyApp = (isAuthenticated, user) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  const [tasks, setTasks] = useState({ assigned: [], free: [] });
  const [currentTask, setCurrentTask] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [showMap, setShowMap] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Состояния для реального положения
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDINATES);
  const [targetLocation, setTargetLocation] = useState(DEFAULT_COORDINATES);
  const [route, setRoute] = useState([]);
  const [lastPositionUpdate, setLastPositionUpdate] = useState(null);
  const [hasActiveLocationSession, setHasActiveLocationSession] = useState(false);

  // Состояние для модального окна с инструкциями по локации
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState(null);
  const [hasTaskInProgress, setHasTaskInProgress] = useState(false);
  const [inProgressTask, setInProgressTask] = useState(null);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const telegramUser = getTelegramUser();
        if (!telegramUser) {
          throw new Error('Не удалось получить данные пользователя Telegram');
        }

        // Загружаем все данные параллельно
        const [tasksResponse, profileResponse] = await Promise.all([
          api.tasks.getForMiniApp(telegramUser.id),
          user && isAuthenticated ? Promise.resolve(user) : api.auth.getProfile()
        ]);

        setTasks(tasksResponse);
        setProfile(profileResponse);
        
        // Проверяем активную сессию локации
        await checkActiveLocationSession(telegramUser);
        
        // Находим текущую задачу и проверяем наличие задачи в работе
        const inProgressTask = tasksResponse.assigned.find(task => task.status === 'in-progress');
        const acceptedTask = tasksResponse.assigned.find(task => task.status === 'accepted');
        const currentTaskToSet = inProgressTask || acceptedTask;
        setCurrentTask(currentTaskToSet || null);
        
        // Проверяем наличие задачи со статусом in-progress (которая блокирует взятие assigned задач)
        setHasTaskInProgress(!!inProgressTask);
        setInProgressTask(inProgressTask || null);
        
        // Если есть задача в работе или принятая задача, показываем карту
        if (inProgressTask || acceptedTask) {
          const taskToShow = inProgressTask || acceptedTask;
          console.log('🚀 Initial load - Setting showMap to true for task:', taskToShow.id, 'status:', taskToShow.status);
          setShowMap(true);
          
          // Получаем реальную позицию пользователя
          try {
            const positionResponse = await api.sessions.getCurrentPosition(telegramUser.id);
            if (positionResponse.hasPosition && positionResponse.position) {
              const realLocation = fromDatabase(positionResponse.position);
              console.log('🚀 Initial load - Setting real location:', realLocation);
              setCurrentLocation(realLocation);
              setTargetLocation(realLocation);
              setRoute([realLocation]);
            } else {
              // Fallback на дефолтные координаты если нет реальной позиции
              console.log('🚀 Initial load - No real position, using default:', DEFAULT_COORDINATES);
              setCurrentLocation(DEFAULT_COORDINATES);
              setTargetLocation(DEFAULT_COORDINATES);
              setRoute([DEFAULT_COORDINATES]);
            }
          } catch (error) {
            console.error('Failed to get initial position:', error);
            // Fallback на дефолтные координаты
            const defaultLocation = [55.751244, 37.618423];
            setCurrentLocation(defaultLocation);
            setTargetLocation(defaultLocation);
            setRoute([defaultLocation]);
          }
        }

      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Обновляем задачи при изменении текущего представления
  useEffect(() => {
    if (currentView === 'home' && isAuthenticated) {
      refreshTasks();
    }
  }, [currentView, isAuthenticated]);

  // Эффект для получения реальных позиций
  useEffect(() => {
    if (!showMap || !currentTask) return;

    const fetchCurrentPosition = async () => {
      try {
        const telegramUser = getTelegramUser();
        if (!telegramUser) return;

        const positionResponse = await api.sessions.getCurrentPosition(telegramUser.id);
        
        if (positionResponse.hasPosition && positionResponse.position) {
          const newLocation = fromDatabase(positionResponse.position);
          const timestamp = positionResponse.position.timestamp;
          
          console.log('📍 Real position received:', newLocation, 'at', timestamp);
          
          setCurrentLocation(newLocation);
          setLastPositionUpdate(new Date(timestamp));
          
          // Обновляем маршрут только если это новая позиция
          setRoute(prev => {
            const lastPos = prev[prev.length - 1];
            if (!lastPos || (lastPos[0] !== newLocation[0] || lastPos[1] !== newLocation[1])) {
              return [...prev, newLocation].slice(-20); // Храним последние 20 точек
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Failed to fetch current position:', error);
      }
    };

    // Получаем позицию сразу при загрузке
    fetchCurrentPosition();

    // Обновляем позицию каждые 5 секунд если задача в работе
    const interval = setInterval(() => {
      if (currentTask?.status === 'in-progress') {
        fetchCurrentPosition();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [showMap, currentTask?.id, currentTask?.status]);

  const handleNavChange = (event, newValue) => {
    triggerHapticSelection();
    setCurrentView(newValue);
    switch (newValue) {
      case 'home':
        navigate('/my-app');
        break;
      case 'settings':
        navigate('/my-app/settings');
        break;
      default:
        break;
    }
  };

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
      triggerHapticFeedback('medium');
      const telegramUser = getTelegramUser();
      await api.tasks.acceptAssigned(taskId, telegramUser.id);
      
      // Обновляем список задач
      const response = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(response);
      
      // Обновляем состояние текущей задачи и карты
      const inProgressTask = response.assigned.find(task => task.status === 'in-progress');
      const acceptedTask = response.assigned.find(task => task.status === 'accepted');
      const currentTaskToSet = inProgressTask || acceptedTask;
      setCurrentTask(currentTaskToSet || null);
      
      setHasTaskInProgress(!!inProgressTask);
      setInProgressTask(inProgressTask || null);
      
      // Если есть принятая задача, показываем карту
      if (acceptedTask && !inProgressTask) {
        console.log('✅ handleAcceptAssigned - Setting showMap to true for accepted task:', acceptedTask.id);
        setShowMap(true);
        // Устанавливаем начальные координаты для карты
        const mockLocation = [DEFAULT_COORDINATES[0] + Math.random() * 0.01, DEFAULT_COORDINATES[1] + Math.random() * 0.01];
        setTargetLocation(mockLocation);
        setCurrentLocation(mockLocation);
        setRoute([mockLocation]);
      }
      
      setSnackbar({
        open: true,
        message: 'Задача принята!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to accept task:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при принятии задачи',
        severity: 'error'
      });
    }
  };

  const handleTakeFree = async (taskId, event) => {
    event.stopPropagation();
    try {
      triggerHapticFeedback('medium');
      const telegramUser = getTelegramUser();
      
      await api.tasks.takeFree(taskId, telegramUser.id);
      
      // Обновляем список задач
      const response = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(response);
      
      // Обновляем состояние текущей задачи и карты
      const inProgressTask = response.assigned.find(task => task.status === 'in-progress');
      const acceptedTask = response.assigned.find(task => task.status === 'accepted');
      const currentTaskToSet = inProgressTask || acceptedTask;
      setCurrentTask(currentTaskToSet || null);
      
      setHasTaskInProgress(!!inProgressTask);
      setInProgressTask(inProgressTask || null);
      
      // Если есть принятая задача, показываем карту
      if (acceptedTask && !inProgressTask) {
        console.log('✅ handleTakeFree - Setting showMap to true for accepted task:', acceptedTask.id);
        setShowMap(true);
        // Устанавливаем начальные координаты для карты
        const mockLocation = [55.751244 + Math.random() * 0.01, 37.618423 + Math.random() * 0.01];
        setTargetLocation(mockLocation);
        setCurrentLocation(mockLocation);
        setRoute([mockLocation]);
      }
      
      setSnackbar({
        open: true,
        message: 'Задача взята!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to take task:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при взятии задачи',
        severity: 'error'
      });
    }
  };

  const handleStartWork = async (taskId, event) => {
    event.stopPropagation();
    try {
      triggerHapticFeedback('medium');
      const telegramUser = getTelegramUser();
      
      console.log('🎯 handleStartWork - Starting work for task:', taskId);
      
      // Получаем реальную позицию пользователя
      try {
        const positionResponse = await api.sessions.getCurrentPosition(telegramUser.id);
        if (positionResponse.hasPosition && positionResponse.position) {
          const realLocation = fromDatabase(positionResponse.position);
          console.log('🎯 handleStartWork - Setting real location:', realLocation);
          setCurrentLocation(realLocation);
          setTargetLocation(realLocation);
          setRoute([realLocation]);
        } else {
          // Fallback на дефолтные координаты
          console.log('🎯 handleStartWork - No real position, using default:', DEFAULT_COORDINATES);
          setCurrentLocation(DEFAULT_COORDINATES);
          setTargetLocation(DEFAULT_COORDINATES);
          setRoute([DEFAULT_COORDINATES]);
        }
      } catch (error) {
        console.error('Failed to get position for start work:', error);
        // Fallback на дефолтные координаты
        setCurrentLocation(DEFAULT_COORDINATES);
        setTargetLocation(DEFAULT_COORDINATES);
        setRoute([DEFAULT_COORDINATES]);
      }
      
      setShowMap(true);
      
      // Обновляем статус задачи
      await api.tasks.startWork(taskId, telegramUser.id);
      
      // Обновляем список задач
      const response = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(response);
      setHasTaskInProgress(true);
      
      // Обновляем текущую задачу
      const updatedTask = response.assigned.find(task => task.id === taskId);
      if (updatedTask) {
        setCurrentTask(updatedTask);
        console.log('🎯 handleStartWork - Updated current task:', updatedTask.id, updatedTask.status);
      }
      
      setSnackbar({
        open: true,
        message: 'Работа начата!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Failed to start work:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при начале работы',
        severity: 'error'
      });
    }
  };

  const handleCompleteWork = async (taskId, event, updatedTask) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      triggerHapticFeedback('medium');
      const telegramUser = getTelegramUser();
      
      // Если задача уже была завершена через модальное окно (updatedTask содержит результат)
      if (updatedTask) {
        // Сбрасываем состояния карты
        setShowMap(false);
        setRoute([]);
        
        // Обновляем список задач
        const response = await api.tasks.getForMiniApp(telegramUser.id);
        setTasks(response);
        setHasTaskInProgress(false);
        
        // Обновляем текущую задачу
        const taskFromResponse = response.assigned.find(task => task.id === taskId);
        if (taskFromResponse) {
          setCurrentTask(taskFromResponse);
        } else {
          // Если задача завершена, убираем её из текущих
          setCurrentTask(null);
        }
        
        setSnackbar({
          open: true,
          message: 'Задача успешно завершена!',
          severity: 'success'
        });
      } else {
        // Если задача еще не завершена, открываем модальное окно
        // Это происходит при прямом вызове (что теперь не должно происходить)
        console.warn('handleCompleteWork called without updatedTask - this should not happen');
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Ошибка при завершении задачи',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const refreshTasks = async () => {
    try {
      const telegramUser = getTelegramUser();
      const tasksResponse = await api.tasks.getForMiniApp(telegramUser.id);
      setTasks(tasksResponse);
      
      // Проверяем активную сессию локации
      await checkActiveLocationSession(telegramUser);
      
      // Обновляем текущую задачу - приоритет задачам в работе
      const inProgressTask = tasksResponse.assigned.find(task => task.status === 'in-progress');
      const acceptedTask = tasksResponse.assigned.find(task => task.status === 'accepted');
      const currentTaskToSet = inProgressTask || acceptedTask;
      setCurrentTask(currentTaskToSet || null);
      
      // Проверяем наличие задачи со статусом in-progress (которая блокирует взятие assigned задач)
      setHasTaskInProgress(!!inProgressTask);
      setInProgressTask(inProgressTask || null);
      
      // Сохраняем текущее состояние карты
      const wasMapVisible = showMap;
      const hadCurrentLocation = currentLocation && currentLocation.length === 2;
      const hadTargetLocation = targetLocation && targetLocation.length === 2;
      const hadRoute = route && route.length > 0;
      
      console.log('🔍 refreshTasks - Debug:', {
        inProgressTask: inProgressTask?.id,
        inProgressTaskStatus: inProgressTask?.status,
        wasMapVisible,
        hadCurrentLocation,
        hadTargetLocation,
        hadRoute,
        showMap
      });
      
      // Если есть задача в работе или принятая задача, показываем карту
      if (inProgressTask || acceptedTask) {
        const taskToShow = inProgressTask || acceptedTask;
        console.log('✅ Setting showMap to true for task:', taskToShow.id, 'status:', taskToShow.status);
        setShowMap(true);
        
        // Получаем реальную позицию пользователя
        try {
          const positionResponse = await api.sessions.getCurrentPosition(telegramUser.id);
          if (positionResponse.hasPosition && positionResponse.position) {
            const realLocation = fromDatabase(positionResponse.position);
            console.log('📍 Setting real location:', realLocation);
            setCurrentLocation(realLocation);
            setTargetLocation(realLocation);
            setRoute([realLocation]);
          } else {
            // Fallback на дефолтные координаты если нет реальной позиции
            console.log('📍 No real position, using default:', DEFAULT_COORDINATES);
            setCurrentLocation(DEFAULT_COORDINATES);
            setTargetLocation(DEFAULT_COORDINATES);
            setRoute([DEFAULT_COORDINATES]);
          }
        } catch (error) {
          console.error('Failed to get position in refreshTasks:', error);
          // Fallback на дефолтные координаты
          setCurrentLocation(DEFAULT_COORDINATES);
          setTargetLocation(DEFAULT_COORDINATES);
          setRoute([DEFAULT_COORDINATES]);
        }
      } else {
        // Если нет задачи в работе или принятой задачи, скрываем карту
        console.log('❌ Setting showMap to false - no active task');
        setShowMap(false);
        setRoute([]);
      }
    } catch (err) {
      console.error('Failed to refresh tasks:', err);
    }
  };

  const handleLocationModalClose = () => {
    setLocationModalOpen(false);
    setPendingTaskId(null);
  };

  const handleLocationModalRetry = async () => {
    if (!pendingTaskId) return;
    
    try {
      const telegramUser = getTelegramUser();
      
      // Проверяем активную сессию (локацию) снова
      const sessionResponse = await api.sessions.getActiveSession(telegramUser.id);
      
      if (!sessionResponse.hasActiveSession) {
        setError('Геолокация все еще не включена. Пожалуйста, следуйте инструкциям.');
        return;
      }
      
      // Начинаем работу с проверкой локации
      await api.tasks.startWork(pendingTaskId, telegramUser.id);
      
      // Обновляем локальное состояние
      setCurrentTask(prev => prev ? { ...prev, status: 'in-progress' } : null);
      setTasks(prev => prev.map(task => 
        task.id === pendingTaskId ? { ...task, status: 'in-progress' } : task
      ));
      
      setLocationModalOpen(false);
      setPendingTaskId(null);
      
    } catch (err) {
      console.error('Failed to start work on retry:', err);
      
      if (err.message && err.message.includes('локацией')) {
        setError('Геолокация все еще не включена. Пожалуйста, следуйте инструкциям.');
      } else {
        setError(err.message || 'Не удалось обновить статус задачи');
      }
    }
  };

  return {
    // State
    currentView,
    tasks,
    currentTask,
    profile,
    loading,
    error,
    expandedTasks,
    showMap,
    snackbar,
    currentLocation,
    targetLocation,
    route,
    lastPositionUpdate,
    hasActiveLocationSession,
    locationModalOpen,
    pendingTaskId,
    hasTaskInProgress,
    inProgressTask,
    
    // Handlers
    handleNavChange,
    handleTaskExpand,
    handleAcceptAssigned,
    handleTakeFree,
    handleStartWork,
    handleCompleteWork,
    handleCloseSnackbar,
    handleLocationModalClose,
    handleLocationModalRetry,
    refreshTasks,
  };
}; 