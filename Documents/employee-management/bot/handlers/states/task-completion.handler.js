const taskService = require('../../services/task.service');
const locationService = require('../../services/location.service');
const stateService = require('../../services/state.service');

/**
 * Обработчик завершения задачи
 * @param {Object} ctx - Контекст Telegram
 * @param {number} taskId - ID задачи
 * @param {string} result - Результат выполнения
 */
const handleTaskCompletion = async (ctx, taskId, result) => {
    try {
        const telegramId = ctx.from.id;
        
        // Получаем пользователя из базы данных
        const userService = require('../../services/user.service');
        const user = await userService.getUserByTelegramId(telegramId);
        if (!user) {
            return await ctx.reply('❌ Вы не зарегистрированы в системе.');
        }
        
        // Проверяем существование задачи и права доступа
        const task = await taskService.getTaskById(taskId);
        if (!task) {
            return await ctx.reply('❌ Задача не найдена или у вас нет прав для её завершения.');
        }

        // Проверяем, что задача назначена текущему пользователю
        if (task.assigned_to !== user.id) {
            return await ctx.reply('❌ Эта задача не назначена вам.');
        }

        // Проверяем, что задача в статусе in-progress
        if (task.status !== 'in-progress') {
            return await ctx.reply('❌ Можно завершить только задачу в работе.');
        }

        // Проверяем наличие результата
        if (!result || !result.trim()) {
            return await ctx.reply('❌ Результат выполнения обязателен.');
        }

        // Начинаем транзакцию
        const client = await require('../../db').connect();
        try {
            await client.query('BEGIN');

            // Обновляем статус задачи
            const updateTaskQuery = `
                UPDATE tasks 
                SET status = 'completed', 
                    result = $1,
                    completed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND assigned_to = $3
                RETURNING *
            `;
            
            const taskResult = await client.query(updateTaskQuery, [result, taskId, user.id]);
            
            if (taskResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return await ctx.reply('❌ Не удалось обновить задачу.');
            }

            // Завершаем активную сессию для этой задачи
            const endSessionQuery = `
                UPDATE sessions 
                SET end_time = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE task_id = $1 AND user_id = $2 AND is_active = true
                RETURNING id
            `;
            
            const sessionResult = await client.query(endSessionQuery, [taskId, user.id]);
            console.log(`🏁 Ended ${sessionResult.rows.length} sessions for completed task ${taskId}`);

            await client.query('COMMIT');

            // Отправляем сообщение об успешном завершении
            await ctx.reply(
                `✅ Задача "${task.title}" успешно завершена!\n\n` +
                `📝 Результат: ${result}\n\n` +
                `🕐 Завершена в ${new Date().toLocaleString('ru-RU')}`
            );

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error in handleTaskCompletion:', error);
        await ctx.reply('❌ Произошла ошибка при завершении задачи. Пожалуйста, попробуйте позже.');
    }
};

/**
 * Обработчик отмены задачи
 * @param {Object} ctx - Контекст Telegram
 * @param {number} taskId - ID задачи
 */
const handleTaskCancellation = async (ctx, taskId) => {
    try {
        const telegramId = ctx.from.id;
        
        // Получаем пользователя из базы данных
        const userService = require('../../services/user.service');
        const user = await userService.getUserByTelegramId(telegramId);
        if (!user) {
            return await ctx.reply('❌ Вы не зарегистрированы в системе.');
        }
        
        // Проверяем существование задачи и права доступа
        const task = await taskService.getTaskById(taskId);
        if (!task) {
            return await ctx.reply('❌ Задача не найдена или у вас нет прав для её отмены.');
        }

        // Проверяем, что задача назначена текущему пользователю
        if (task.assigned_to !== user.id) {
            return await ctx.reply('❌ Эта задача не назначена вам.');
        }

        // Проверяем, что задача в статусе in-progress
        if (task.status !== 'in-progress') {
            return await ctx.reply('❌ Можно отменить только задачу в работе.');
        }

        // Начинаем транзакцию
        const client = await require('../../db').connect();
        try {
            await client.query('BEGIN');

            // Обновляем статус задачи
            const updateTaskQuery = `
                UPDATE tasks 
                SET status = 'cancelled', 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND assigned_to = $2
                RETURNING *
            `;
            
            const taskResult = await client.query(updateTaskQuery, [taskId, user.id]);
            
            if (taskResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return await ctx.reply('❌ Не удалось отменить задачу.');
            }

            // Завершаем активную сессию для этой задачи
            const endSessionQuery = `
                UPDATE sessions 
                SET end_time = CURRENT_TIMESTAMP, is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE task_id = $1 AND user_id = $2 AND is_active = true
                RETURNING id
            `;
            
            const sessionResult = await client.query(endSessionQuery, [taskId, user.id]);
            console.log(`🏁 Ended ${sessionResult.rows.length} sessions for cancelled task ${taskId}`);

            await client.query('COMMIT');

            // Отправляем сообщение об успешной отмене
            await ctx.reply(
                `❌ Задача "${task.title}" отменена.\n\n` +
                `🕐 Отменена в ${new Date().toLocaleString('ru-RU')}`
            );

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error in handleTaskCancellation:', error);
        await ctx.reply('❌ Произошла ошибка при отмене задачи. Пожалуйста, попробуйте позже.');
    }
};

module.exports = {
    handleTaskCompletion,
    handleTaskCancellation
}; 