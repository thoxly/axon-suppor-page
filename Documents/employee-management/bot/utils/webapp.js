/**
 * Утилиты для работы с Telegram WebApp URL в bot
 */

/**
 * Генерирует правильный URL для Telegram WebApp
 */
const getWebAppUrl = (path = '/my-app') => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    return `${frontendUrl}${path}`;
};

/**
 * Создает инлайн кнопку для открытия WebApp
 */
const createWebAppButton = (text = '🚀 Открыть мини-приложение', path = '/my-app') => {
    return {
        text: text,
        web_app: { url: getWebAppUrl(path) }
    };
};

/**
 * Создает инлайн клавиатуру с кнопкой WebApp
 */
const createWebAppKeyboard = (path = '/my-app') => {
    return {
        inline_keyboard: [[createWebAppButton('🚀 Открыть мини-приложение', path)]]
    };
};

module.exports = {
    getWebAppUrl,
    createWebAppButton,
    createWebAppKeyboard
}; 