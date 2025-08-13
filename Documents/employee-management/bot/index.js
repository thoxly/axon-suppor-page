require('dotenv').config();
const { Telegraf } = require('telegraf');
const config = require('./config');
const fsm = require('./handlers/fsm.handler');
const handlers = require('./handlers/index'); // Импортируем обработчики команд и состояний
const { handleTaskAcceptance } = require('./handlers/states/task-acceptance.handler');
const { locationHandler, editedLocationHandler } = require('./handlers/location.handler');
const locationService = require('./services/location.service');

// Create bot instance
const bot = new Telegraf(config.telegram.botToken);

// Middleware to log updates
bot.use(async (ctx, next) => {
    const start = new Date();
    console.log('⚡️ Received update:', {
        type: ctx.updateType,
        message: ctx.message?.text,
        from: ctx.from?.id,
        chat: ctx.chat?.id
    });
    await next();
    const ms = new Date() - start;
    console.log('✅ Response time: %sms', ms);
});

// Register location handlers (before general message handler)
bot.on('location', locationHandler);
bot.on('edited_message', editedLocationHandler);

// Обработка всех обновлений через FSM
bot.on('message', async (ctx) => {
    await fsm.handleUpdate(ctx);
});

// Обработка callback-запросов для принятия задач
bot.on('callback_query', async (ctx) => {
    try {
        const callbackData = ctx.callbackQuery.data;
        
        if (callbackData.startsWith('take_task:')) {
            const taskId = parseInt(callbackData.split(':')[1]);
            
            // Отвечаем на callback query чтобы убрать loading состояние
            await ctx.answerCbQuery();
            
            // Проверяем активную сессию
            const userId = ctx.from.id;
            const activeSession = await locationService.getActiveSession(userId);
            
            if (!activeSession) {
                // Если нет активной сессии, запрашиваем локацию
                await handleTaskAcceptance(ctx, taskId);
            } else {
                // Если есть активная сессия, сразу принимаем задачу
                await handleTaskAcceptance(ctx, taskId);
            }
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCbQuery('❌ Произошла ошибка. Попробуйте позже.');
    }
});

// Error handling
bot.catch((err, ctx) => {
    console.error(`❌ Error for ${ctx.updateType}:`, err);
    return ctx.reply('❌ Произошла ошибка. Пожалуйста, попробуйте позже или используйте /start для перезапуска.');
});

// Start bot
bot.launch()
    .then(() => {
        console.log('🚀 Bot is running...');
        console.log('🤖 Bot username:', bot.botInfo?.username);
        
        // Start location connection monitoring
        locationService.startConnectionMonitoring(bot);
    })
    .catch((err) => {
        console.error('❌ Failed to start bot:', err);
    });

// Enable graceful stop
process.once('SIGINT', () => {
    console.log('👋 Bot is shutting down...');
    locationService.stopConnectionMonitoring();
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('👋 Bot is shutting down...');
    locationService.stopConnectionMonitoring();
    bot.stop('SIGTERM');
}); 