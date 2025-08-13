import { useState, useEffect } from 'react';
import { getSystemThemePreference, createThemeByMode, createTelegramWebAppTheme } from '../theme';
import { isTelegramWebApp } from '../utils/telegram';

export const useTheme = () => {
  const [mode, setMode] = useState(() => {
    // В Telegram Web App всегда используем светлую тему
    if (isTelegramWebApp()) {
      return 'light';
    }
    // Иначе используем системное предпочтение
    return getSystemThemePreference();
  });

  const [theme, setTheme] = useState(() => {
    // В Telegram Web App используем специальную тему
    if (isTelegramWebApp()) {
      return createTelegramWebAppTheme();
    }
    return createThemeByMode(mode);
  });

  // Слушатель изменений системной темы (только для обычного веб-приложения)
  useEffect(() => {
    // В Telegram Web App не слушаем изменения системной темы
    if (isTelegramWebApp()) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const newMode = e.matches ? 'dark' : 'light';
      setMode(newMode);
      setTheme(createThemeByMode(newMode));
    };

    // Добавляем слушатель
    mediaQuery.addEventListener('change', handleChange);

    // Очистка при размонтировании
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Функция для ручного переключения темы
  const toggleTheme = () => {
    // В Telegram Web App не позволяем переключать тему
    if (isTelegramWebApp()) {
      return;
    }
    
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    setTheme(createThemeByMode(newMode));
  };

  // Функция для установки конкретной темы
  const setThemeMode = (newMode) => {
    // В Telegram Web App принудительно используем специальную тему
    if (isTelegramWebApp()) {
      setMode('light');
      setTheme(createTelegramWebAppTheme());
      return;
    }
    
    if (newMode === 'light' || newMode === 'dark') {
      setMode(newMode);
      setTheme(createThemeByMode(newMode));
    }
  };

  return {
    mode,
    theme,
    toggleTheme,
    setThemeMode,
    isDark: mode === 'dark',
    isLight: mode === 'light',
    isWebApp: isTelegramWebApp(),
  };
}; 