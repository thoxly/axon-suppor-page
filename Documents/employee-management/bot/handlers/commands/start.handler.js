const fsm = require('../fsm.handler');
const userService = require('../../services/user.service');
const { createWebAppKeyboard } = require('../../utils/webapp');

const startHandler = async (ctx) => {
    console.log('🎬 Start command handler called');
    
    const telegramId = ctx.from.id;
    
    try {
        // Проверяем, зарегистрирован ли пользователь
        const user = await userService.getUserByTelegramId(telegramId);
        
        if (user) {
            // Пользователь уже зарегистрирован
            const registeredMessage = `✅ Вы уже зарегистрированы в системе!

👤 Имя: ${user.full_name || 'Не указано'}
🏢 Компания: ${user.company_name || 'Не указана'}
🆔 ID компании: ${user.company_id || 'Не указан'}

Вы можете использовать бота для работы с задачами и отчетами.

📱 **Доступ к мини-приложению:**
Для полного доступа к функциям используйте мини-приложение через кнопку ниже.`;
            
            console.log('📤 Sending registered user message');
            
            return ctx.reply(registeredMessage, {
                reply_markup: createWebAppKeyboard()
            });
        } else {
            // Пользователь не зарегистрирован
            const welcomeMessage = `👋 Добро пожаловать в Employee Management Bot!

Для регистрации просто отправьте ваш инвайт-код в этот чат.

📱 **После регистрации:**
Вы сможете использовать как бота, так и мини-приложение для работы с задачами.`;
            
            console.log('📤 Sending welcome message for new user');
            return ctx.reply(welcomeMessage);
        }
    } catch (error) {
        console.error('❌ Error in start handler:', error);
        return ctx.reply('Произошла ошибка при обработке команды. Попробуйте позже.');
    }
};

module.exports = startHandler; 