const userService = require('../../services/user.service');
const locationService = require('../../services/location.service');

/**
 * Команда для проверки статуса отслеживания
 */
const statusHandler = async (ctx) => {
    const telegramId = ctx.from.id;
    
    try {
        // Проверяем регистрацию пользователя
        const user = await userService.getUserByTelegramId(telegramId);
        if (!user) {
            return ctx.reply('❌ Вы не зарегистрированы в системе. Используйте /start для регистрации.');
        }

        // Получаем активную сессию
        const activeSession = await locationService.getActiveSession(user.id);
        
        if (!activeSession) {
            return ctx.reply(
                '📍 Отслеживание локации не активно.\n\n' +
                'Для начала отслеживания поделитесь live-локацией.'
            );
        }

        // Проверяем последнее обновление
        const lastUpdate = locationService.getLastLocationTime(telegramId);
        const lastUpdateText = lastUpdate 
            ? new Date(lastUpdate).toLocaleString('ru-RU')
            : 'Нет данных';

        // Получаем информацию о задаче
        let taskInfo = '';
        if (activeSession.task_id) {
            const task = await locationService.getUserActiveTask(user.id);
            if (task) {
                taskInfo = `\n📋 Активная задача: ${task.title}`;
            }
        } else {
            taskInfo = '\n⏳ Ожидание назначения задачи';
        }

        const statusIcon = activeSession.is_active ? '🟢' : '🔴';
        const statusText = activeSession.is_active ? 'Активно' : 'Неактивно';

        return ctx.reply(
            `📍 Статус отслеживания локации:\n\n` +
            `${statusIcon} Статус: ${statusText}\n` +
            `🕐 Начало сессии: ${new Date(activeSession.start_time).toLocaleString('ru-RU')}\n` +
            `📱 Последнее обновление: ${lastUpdateText}` +
            taskInfo
        );

    } catch (error) {
        console.error('❌ Error in status handler:', error);
        return ctx.reply('❌ Произошла ошибка при получении статуса.');
    }
};

/**
 * Команда для остановки отслеживания
 */
const stopTrackingHandler = async (ctx) => {
    const telegramId = ctx.from.id;
    
    try {
        // Проверяем регистрацию пользователя
        const user = await userService.getUserByTelegramId(telegramId);
        if (!user) {
            return ctx.reply('❌ Вы не зарегистрированы в системе. Используйте /start для регистрации.');
        }

        // Получаем активную сессию
        const activeSession = await locationService.getActiveSession(user.id);
        
        if (!activeSession) {
            return ctx.reply('📍 Отслеживание локации уже неактивно.');
        }

        // Проверяем, есть ли привязанная задача
        if (activeSession.task_id) {
            const task = await locationService.getUserActiveTask(user.id);
            if (task && task.status === 'in-progress') {
                return ctx.reply(
                    '⚠️ Нельзя остановить отслеживание во время выполнения задачи.\n\n' +
                    'Сначала завершите текущую задачу в веб-интерфейсе.'
                );
            }
        }

        // Завершаем сессию
        await locationService.endSession(activeSession.id);
        
        // Удаляем из мониторинга
        locationService.lastLocationUpdate.delete(telegramId);

        return ctx.reply('🛑 Отслеживание локации остановлено.');

    } catch (error) {
        console.error('❌ Error in stop tracking handler:', error);
        return ctx.reply('❌ Произошла ошибка при остановке отслеживания.');
    }
};

module.exports = {
    statusHandler,
    stopTrackingHandler
}; 