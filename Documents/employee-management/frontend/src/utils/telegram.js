/**
 * Утилиты для работы с Telegram Web App API
 */

// Инициализация Telegram Web App из URL параметров
const initializeTelegramFromURL = () => {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('tgWebAppData=')) {
      return false;
    }

    // Извлекаем tgWebAppData из хэша
    const tgWebAppDataMatch = hash.match(/tgWebAppData=([^&]+)/);
    if (!tgWebAppDataMatch) {
      return false;
    }

    const tgWebAppData = decodeURIComponent(tgWebAppDataMatch[1]);
    console.log('Extracted tgWebAppData:', tgWebAppData);

    // Парсим параметры
    const params = new URLSearchParams(tgWebAppData);
    
    // Создаем объект пользователя
    const userStr = params.get('user');
    let user = null;
    if (userStr) {
      try {
        user = JSON.parse(decodeURIComponent(userStr));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Инициализируем window.Telegram.WebApp
    window.Telegram = window.Telegram || {};
    window.Telegram.WebApp = {
      initData: tgWebAppData,
      initDataUnsafe: {
        user: user,
        query_id: params.get('query_id'),
        chat_instance: params.get('chat_instance'),
        chat_type: params.get('chat_type'),
        auth_date: params.get('auth_date'),
        hash: params.get('hash')
      },
      version: params.get('tgWebAppVersion') || '8.0',
      platform: params.get('tgWebAppPlatform') || 'tdesktop',
      themeParams: (() => {
        const themeParamsStr = params.get('tgWebAppThemeParams');
        if (themeParamsStr) {
          try {
            return JSON.parse(decodeURIComponent(themeParamsStr));
          } catch (e) {
            console.error('Error parsing theme params:', e);
          }
        }
        return {};
      })(),
      ready: function() {
        console.log('Telegram WebApp ready called');
      },
      expand: function() {
        console.log('Telegram WebApp expand called');
      },
      close: function() {
        console.log('Telegram WebApp close called');
      }
    };

    console.log('Telegram WebApp initialized from URL:', window.Telegram.WebApp);
    return true;
  } catch (error) {
    console.error('Error initializing Telegram from URL:', error);
    return false;
  }
};

// Проверка, запущено ли приложение в Telegram
export const isTelegramWebApp = () => {
  try {
    // Сначала пытаемся инициализировать из URL
    if (!window.Telegram?.WebApp?.initData) {
      initializeTelegramFromURL();
    }
    
    return Boolean(window.Telegram?.WebApp?.initData);
  } catch (error) {
    console.error('Error checking Telegram WebApp:', error);
    return false;
  }
};

// Получение пользователя из Telegram
export const getTelegramUser = () => {
  try {
    // Убеждаемся, что Telegram WebApp инициализирован
    if (isTelegramWebApp() && window.Telegram.WebApp.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      console.log('Telegram user data:', user);
      return user;
    }
  } catch (error) {
    console.error('Error getting Telegram user:', error);
  }
  return null;
};

// Инициализация Telegram Web App
export const initTelegramWebApp = () => {
  try {
    if (isTelegramWebApp()) {
      console.log('Initializing Telegram WebApp...');
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      // Устанавливаем светлую тему в Telegram Web App
      if (window.Telegram.WebApp.setHeaderColor) {
        window.Telegram.WebApp.setHeaderColor('#FFFFFF');
      }
      if (window.Telegram.WebApp.setBackgroundColor) {
        window.Telegram.WebApp.setBackgroundColor('#FFFFFF');
      }
      
      console.log('Telegram WebApp initialized successfully');
    } else {
      console.log('Telegram WebApp not available for initialization');
    }
  } catch (error) {
    console.error('Error initializing Telegram WebApp:', error);
  }
};

// Закрыть Web App
export const closeWebApp = () => {
  try {
    if (isTelegramWebApp()) {
      window.Telegram.WebApp.close();
    }
  } catch (error) {
    console.error('Error closing WebApp:', error);
  }
}; 

export const triggerHapticFeedback = (style = 'light') => {
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    } catch (error) {
      console.warn('Haptic feedback not available:', error);
    }
  }
};

export const triggerHapticSelection = () => {
  if (window.Telegram && window.Telegram.WebApp) {
    try {
      window.Telegram.WebApp.HapticFeedback.selectionChanged();
    } catch (error) {
      console.warn('Haptic selection not available:', error);
    }
  }
}; 