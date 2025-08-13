const userService = require('../services/user.service');
const locationService = require('../services/location.service');
const { fromTelegram } = require('../utils/coordinates');

/**
 * Обработчик получения live геолокации
 * @param {Object} ctx - Контекст Telegraf
 * @param {boolean} isEdit - Флаг, указывающий что это обновление (edited_message)
 */
async function handleLocation(ctx, isEdit = false) {
    const telegramId = ctx.from.id;
    const location = ctx.message?.location || ctx.editedMessage?.location;
    
    if (!location) {
        console.log('❌ No location data found in message');
        return;
    }

    console.log(`📍 ${isEdit ? 'Updated' : 'Received'} location from user ${telegramId}:`, {
        latitude: location.latitude,
        longitude: location.longitude,
        live_period: location.live_period,
        heading: location.heading,
        proximity_alert_radius: location.proximity_alert_radius
    });

    try {
        // Проверяем регистрацию пользователя
        const user = await userService.getUserByTelegramId(telegramId);
        if (!user) {
            return ctx.reply('❌ Вы не зарегистрированы в системе. Используйте /start для регистрации.');
        }

        const updateType = ctx.updateType; // 'message' | 'edited_message'
        const livePeriod = location.live_period;
        const isLiveStart = updateType === 'message' && Number.isInteger(livePeriod) && livePeriod >= 900;
        const isLiveUpdate = updateType === 'edited_message' && Number.isInteger(livePeriod) && livePeriod >= 900;
        const isLiveStopSignal = updateType === 'edited_message' && (livePeriod === undefined || livePeriod === null);

        // 1) Явный старт live (первая отправка live от пользователя)
        if (isLiveStart) {
            // Любой start снимает потенциальную остановку
            locationService.clearPotentialStop(telegramId);

            // Получаем/создаем активную сессию
            let activeSession = await locationService.getActiveSession(user.id);
            if (!activeSession) {
                activeSession = await locationService.createSession(user.id, null);
                console.log(`✅ Created new session ${activeSession.id} for user ${user.id}`);
                await ctx.reply('📍 Начато отслеживание вашей локации. Ожидаем назначения задачи...');
            }

            // Обновляем heartbeat
            locationService.updateLastLocationTime(telegramId);

            // Сохраняем позицию с текущим временем
            const coords = fromTelegram(location);
            if (coords) {
                await locationService.savePosition(
                    user.id,
                    activeSession.id,
                    coords[0], // latitude
                    coords[1], // longitude
                    new Date()
                );
            }

            console.log(`✅ Position saved for user ${user.id}, session ${activeSession.id}`);

            // Линкуем задачу если есть
            if (!activeSession.task_id) {
                const activeTask = await locationService.getUserActiveTask(user.id);
                if (activeTask) {
                    await locationService.updateSessionTask(activeSession.id, activeTask.id);
                    console.log(`🔗 Linked task ${activeTask.id} to session ${activeSession.id}`);
                    await ctx.reply(
                        `📋 Задача привязана к отслеживанию:\n\n` +
                        `**${activeTask.title}**\n` +
                        `${activeTask.description || ''}\n\n` +
                        `🕐 Отслеживание началось в ${new Date().toLocaleString('ru-RU')}`,
                        { parse_mode: 'Markdown' }
                    );
                }
            }
            return;
        }

        // 2) Обновления live — продолжаем сессию, не считаем как остановку
        if (isLiveUpdate) {
            // Снимаем потенциальную остановку и обновляем heartbeat
            locationService.clearPotentialStop(telegramId);
            locationService.updateLastLocationTime(telegramId);

            // Гарантируем наличие активной сессии
            let activeSession = await locationService.getActiveSession(user.id);
            if (!activeSession) {
                // Если по каким-то причинам сессию деактивировали — создаем новую
                activeSession = await locationService.createSession(user.id, null);
                console.log(`✅ Created new session ${activeSession.id} for user ${user.id}`);
            } else if (!activeSession.is_active) {
                await locationService.reactivateSession(activeSession.id);
            }

            // Сохраняем позицию с текущим временем
            const coords = fromTelegram(location);
            if (coords) {
                await locationService.savePosition(
                    user.id,
                    activeSession.id,
                    coords[0], // latitude
                    coords[1], // longitude
                    new Date()
                );
            }
            console.log(`✅ Position saved for user ${user.id}, session ${activeSession.id}`);
            return;
        }

        // 3) Сигнал возможной остановки: edited_message без live_period
        if (isLiveStopSignal) {
            // Помечаем как кандидат на остановку. Фактическую деактивацию выполняет мониторинг после grace-паузы
            locationService.markPotentialStop(telegramId);
            console.log('🛑 Live location potential stop marked (waiting grace)');
            return;
        }

        // 4) Обычная точка (static location) — просим включить live
        return ctx.reply(
            '📍 Пожалуйста, поделитесь live-локацией!\n\n' +
            '1. Нажмите на скрепку (📎)\n' +
            '2. Выберите "Геопозиция"\n' +
            '3. Включите "Передавать геопозицию" на 15 минут или 1 час\n' +
            '4. Нажмите "Отправить геопозицию"'
        );

    } catch (error) {
        console.error('❌ Error in handleLocation:', error);
        if (!isEdit) {
            await ctx.reply('❌ Произошла ошибка при обработке локации. Пожалуйста, попробуйте позже.');
        }
    }
}

/**
 * Обработчик первоначальной локации
 */
const locationHandler = async (ctx) => {
    return handleLocation(ctx, false);
};

/**
 * Обработчик обновлений локации (edited_message)
 */
const editedLocationHandler = async (ctx) => {
    // Проверяем, что обновленное сообщение содержит локацию
    if (ctx.editedMessage && ctx.editedMessage.location) {
        return handleLocation(ctx, true);
    }
};

module.exports = {
    locationHandler,
    editedLocationHandler,
    handleLocation
}; 