import React, { useEffect, useState, useRef } from 'react';
import { Box, Container, Typography, Card, CardContent, Button, CircularProgress } from '@mui/material';
import { isTelegramWebApp, initTelegramWebApp, getTelegramUser } from '../utils/telegram';
import { api } from '../utils/api';
import { useAuthContext } from '../context/AuthContext';
import { useThemeContext } from '../context/ThemeContext';

const TelegramAuthWrapper = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [telegramId, setTelegramId] = useState(null);
  const authStateRef = useRef({ inProgress: false, completed: false });
  const { login } = useAuthContext();
  const { theme } = useThemeContext();

  useEffect(() => {
    const initAuth = async () => {
      // Защита от повторного вызова используя ref
      if (authStateRef.current.inProgress || authStateRef.current.completed) {
        console.log('TelegramAuthWrapper: Auth already in progress or completed, skipping');
        return;
      }
      
      try {
        authStateRef.current.inProgress = true;
        console.log('=== TELEGRAM AUTH WRAPPER INITIALIZATION ===');
        console.log('TelegramAuthWrapper: Starting initialization');
        console.log('Current URL:', window.location.href);
        console.log('Current pathname:', window.location.pathname);
        console.log('Current origin:', window.location.origin);
        
        // If not in Telegram Web App, show regular content
        if (!isTelegramWebApp()) {
          console.log('TelegramAuthWrapper: Not in Telegram Web App');
          setLoading(false);
          authStateRef.current.inProgress = false;
          return;
        }

        // Initialize Telegram Web App
        console.log('TelegramAuthWrapper: Initializing Telegram Web App');
        initTelegramWebApp();

        // Get user data from Telegram
        const telegramUser = getTelegramUser();
        
        console.log('TelegramAuthWrapper: Telegram user data:', telegramUser);

        if (!telegramUser?.id) {
          const error = 'Не удалось получить данные пользователя Telegram';
          console.error('TelegramAuthWrapper:', error);
          setError(error);
          setLoading(false);
          authStateRef.current.inProgress = false;
          return;
        }

        try {
          console.log('TelegramAuthWrapper: Performing direct auth with initData');
            
          // Выполняем прямую авторизацию через Telegram WebApp
            const authData = {
              initData: window.Telegram.WebApp.initData
            };
            
          console.log('TelegramAuthWrapper: Auth data to send:', { 
            hasInitData: !!authData.initData,
            initDataLength: authData.initData.length 
          });
              
              const authResponse = await api.auth.telegramWebAppAuth(authData);
              console.log('TelegramAuthWrapper: Auth successful:', authResponse);
              
              // Авторизуем пользователя в системе
              console.log('TelegramAuthWrapper: Calling login with:', {
                hasAccessToken: !!authResponse.accessToken,
                hasUser: !!authResponse.user,
                userData: authResponse.user
              });
              
              login(authResponse.accessToken, authResponse.user);
              setTelegramId(telegramUser.id);
              
              // Сохраняем telegram_id в localStorage для использования в API запросах
              localStorage.setItem('telegramId', telegramUser.id);
              console.log('TelegramAuthWrapper: Authorization completed successfully');
              
              // Устанавливаем loading в false после успешной авторизации
              setLoading(false);
              authStateRef.current.inProgress = false;
              authStateRef.current.completed = true;
              setError(null); // Очищаем ошибку после успешной авторизации
              return; // Прерываем выполнение после успешной авторизации
            } catch (authError) {
              console.error('TelegramAuthWrapper: Auth error:', authError);
          
          // Проверяем, нужна ли регистрация
          if (authError.response?.data?.needsRegistration) {
            setError('Для использования мини-приложения необходимо зарегистрироваться через Telegram бота. Отправьте команду /start в боте и следуйте инструкциям.');
          } else {
            setError('Ошибка авторизации: ' + (authError.message || 'Неизвестная ошибка'));
          }
          
          setLoading(false);
          authStateRef.current.inProgress = false;
        }
      } catch (error) {
        console.error('TelegramAuthWrapper: General error:', error);
        setError(error.message || 'Ошибка инициализации');
        setLoading(false);
        authStateRef.current.inProgress = false;
      }
    };

    console.log('TelegramAuthWrapper: Starting auth process');
    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Если не в Telegram Web App, показываем обычное содержимое
  if (!isTelegramWebApp()) {
    console.log('TelegramAuthWrapper: Rendering regular content (not in Telegram)');
    return children;
  }

  if (loading && !authStateRef.current.completed) {
    console.log('TelegramAuthWrapper: Rendering loading state');
    return (
      <Box sx={{ 
        bgcolor: theme.palette.background.default, 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !authStateRef.current.completed) {
    console.log('TelegramAuthWrapper: Rendering error state:', error);
    console.log('TelegramAuthWrapper: Current state:', { loading, authInProgress: authStateRef.current.inProgress, authCompleted: authStateRef.current.completed, telegramId });
    return (
      <Box sx={{ bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
        <Container maxWidth="sm" sx={{ pt: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" component="h1" sx={{ mb: 2, fontWeight: 'bold' }}>
                ❌ Ошибка авторизации
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 3 }}>
                {error}
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>Для регистрации:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  1. Откройте Telegram бота @arrived_rf_bot
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  2. Отправьте команду /start
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  3. Введите ваш инвайт-код
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  4. После регистрации используйте команду /app в боте
                </Typography>
              </Box>

              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  if (window.Telegram?.WebApp) {
                    window.Telegram.WebApp.close();
                  }
                }}
              >
                Закрыть
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  if (!telegramId) {
    console.log('TelegramAuthWrapper: No telegram ID');
    return (
      <Box sx={{ 
        bgcolor: theme.palette.background.default, 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  console.log('TelegramAuthWrapper: Rendering children with telegram ID:', telegramId);
  console.log('TelegramAuthWrapper: Auth completed successfully, showing content');
  return children;
};

export default TelegramAuthWrapper; 