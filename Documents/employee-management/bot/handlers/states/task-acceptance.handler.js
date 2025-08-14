const taskService = require('../../services/task.service');
const locationService = require('../../services/location.service');
const stateService = require('../../services/state.service');

/**
 * Обработчик принятия задачи в работу
 * @param {Object} ctx - Контекст Telegram
 * @param {Object} task - Объект задачи
 */
const handleTaskAcceptance = async (ctx, taskId) => {
    try {
        const userId = ctx.from.id;
        
        // Проверяем наличие активных задач
        const activeTasksCount = await taskService.getUserTasksCount(userId, 'in-progress');
        if (activeTasksCount > 0) {
            return await ctx.reply('⚠️ У вас уже есть активная задача в работе. Пожалуйста, завершите её прежде чем брать новую.');
        }

        // Проверяем существование активной сессии отслеживания
        const activeSession = await locationService.getActiveSession(userId);
        
        if (!activeSession) {
            // Переводим пользователя в состояние ожидания локации
            await stateService.setState(userId, 'AWAITING_LOCATION', { pendingTaskId: taskId });
            
            return await ctx.reply(`📍 Для начала работы над задачей, пожалуйста, включите отправку live-локации:

1. Нажмите на скрепку (📎)
2. Выберите "Геопозиция"
3. Включите "Передавать геопозицию" 
4. Нажмите "Отправить геопозицию"`);
        }

        // Если есть активная сессия, принимаем задачу
        const task = await taskService.getTaskById(taskId);
        if (!task) {
            return await ctx.reply('❌ Задача не найдена или уже взята другим сотрудником.');
        }

        // Обновляем статус задачи
        await taskService.updateTaskStatus(taskId, 'in-progress', userId);
        
        // Завершаем предыдущую сессию (если она была привязана к другой задаче)
        if (activeSession.task_id && activeSession.task_id !== taskId) {
            await locationService.endSession(activeSession.id);
            console.log(`🏁 Ended previous session ${activeSession.id} for task ${activeSession.task_id}`);
        }
        
        // Создаем новую сессию для текущей задачи
        const newSession = await locationService.createSession(userId, taskId);
        console.log(`✅ Created new session ${newSession.id} for task ${taskId}`);

        // Отправляем сообщение об успешном принятии задачи
        await ctx.reply(`✅ Задача "${task.title}" взята в работу!

📱 Для управления задачей перейдите в мини-приложение:`, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '📱 Открыть ',
                            web_app: { url: process.env.MINI_APP_URL  }
                        }
                    ]
                ]
            }
        });

    } catch (error) {
        console.error('Error in handleTaskAcceptance:', error);
        await ctx.reply('❌ Произошла ошибка при принятии задачи. Пожалуйста, попробуйте позже.');
    }
};

module.exports = {
    handleTaskAcceptance
}; 