import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { getTelegramUser } from '../utils/telegram';

export const useMyAppSimple = (isAuthenticated, user) => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('home');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [hasTaskInProgress, setHasTaskInProgress] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const telegramUser = getTelegramUser();
        if (!telegramUser) {
          throw new Error('Не удалось получить данные пользователя Telegram');
        }

        // Загружаем профиль
        const profileResponse = user && isAuthenticated ? user : await api.auth.getProfile();
        setProfile(profileResponse);

        // Проверяем наличие задачи в работе
        try {
          const tasksResponse = await api.tasks.getForMiniApp(telegramUser.id);
          const taskInProgress = tasksResponse.assigned.find(t => t.status === 'in-progress');
          setHasTaskInProgress(!!taskInProgress);
          
          // Если есть задача в работе, перенаправляем на страницу текущей задачи
          if (taskInProgress) {
            navigate('/my-app/current-task');
          }
        } catch (taskError) {
          console.warn('Failed to check tasks:', taskError);
          // Не блокируем загрузку приложения если не удалось проверить задачи
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
  }, [isAuthenticated, user, navigate]);

  const handleNavChange = (event, newValue) => {
    setCurrentView(newValue);
    switch (newValue) {
      case 'home':
        navigate('/my-app');
        break;
      default:
        break;
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleLocationModalClose = () => {
    setLocationModalOpen(false);
  };

  const handleLocationModalRetry = async () => {
    // Логика повторной попытки
    setLocationModalOpen(false);
  };

  return {
    // State
    currentView,
    profile,
    loading,
    error,
    snackbar,
    locationModalOpen,
    hasTaskInProgress,
    
    // Handlers
    handleNavChange,
    handleCloseSnackbar,
    handleLocationModalClose,
    handleLocationModalRetry,
  };
}; 