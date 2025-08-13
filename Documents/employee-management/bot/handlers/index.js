const fsm = require('./fsm.handler');
const { createWebAppKeyboard } = require('../utils/webapp');

// Import command handlers
const startHandler = require('./commands/start.handler');
const leaveHandler = require('./commands/leave.handler');
const { statusHandler, stopTrackingHandler } = require('./commands/location.handler');

// Import state handlers
const awaitingInviteHandler = require('./states/awaiting-invite.handler');
const registeredHandler = require('./states/registered.handler');
const leaveConfirmationHandler = require('./states/leave-confirmation.handler');

// Register commands
fsm.command('start', startHandler)
   .command('leave', leaveHandler, ['REGISTERED'])
   .command('status', statusHandler)
   .command('stop_tracking', stopTrackingHandler)
       .command('app', async (ctx) => {
        const telegramId = ctx.from.id;
        const user = await require('../services/user.service').getUserByTelegramId(telegramId);
        
        if (!user) {
            return ctx.reply('❌ Для доступа к мини-приложению необходимо сначала зарегистрироваться. Используйте /start для регистрации.');
        }
        
        return ctx.reply(`📱 **Мини-приложение готово к запуску!**

👤 Пользователь: ${user.full_name || 'Не указано'}
🏢 Компания: ${user.company_name || 'Не указана'}

🚀 Нажмите кнопку ниже для открытия мини-приложения с полным функционалом:
• Просмотр и принятие задач
• Отправка отчетов о выполнении
• Отслеживание прогресса
• Управление профилем`, {
            reply_markup: createWebAppKeyboard()
        });
    })
   .command('help', async (ctx) => {
       const telegramId = ctx.from.id;
       const user = await require('../services/user.service').getUserByTelegramId(telegramId);
       
       const helpMessage = `📋 Доступные команды:

/start - Начать регистрацию
/app - Открыть мини-приложение
/leave - Покинуть компанию
/status - Статус отслеживания локации
/stop_tracking - Остановить отслеживание
/help - Показать это сообщение
/cancel - Отменить текущее действие

📍 **Отслеживание локации:**
Поделитесь live-локацией для начала отслеживания вашего местоположения во время выполнения задач.

📱 **Мини-приложение:**
Используйте /app для доступа к полному функционалу через веб-интерфейс.`;

               // Если пользователь зарегистрирован, добавляем кнопку
        if (user) {
            return ctx.reply(helpMessage, {
                reply_markup: createWebAppKeyboard()
            });
        }
       
       return ctx.reply(helpMessage);
   })
   .command('cancel', async (ctx) => {
       await fsm.clearState(ctx);
       return ctx.reply('🔄 Действие отменено. Используйте /start для начала.');
   });

// Register states
fsm.state('AWAITING_INVITE', awaitingInviteHandler)
   .state('REGISTERED', registeredHandler)
   .state('LEAVE_CONFIRMATION', leaveConfirmationHandler);

// Override default stateless message handler
fsm.handleStatelessMessage = async (ctx) => {
    return ctx.reply('👋 Используйте /start для начала работы с ботом.');
};

module.exports = fsm; 