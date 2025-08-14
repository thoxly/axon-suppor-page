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
                // Проверяем, есть ли активная задача
                const activeTask = await locationService.getUserActiveTask(user.id);
                activeSession = await locationService.createSession(user.id, activeTask ? activeTask.id : null);
                console.log(`✅ Created new session ${activeSession.id} for user ${user.id}${activeTask ? ` with task ${activeTask.id}` : ''}`);
                
                if (activeTask) {
                    await ctx.reply(
                        `📍 Начато отслеживание для задачи:\n\n` +
                        `**${activeTask.title}**\n` +
                        `${activeTask.description || ''}\n\n` +
                        `🕐 Отслеживание началось в ${new Date().toLocaleString('ru-RU')}`,
                        { parse_mode: 'Markdown' }
                    );
                } else {
                    await ctx.reply('📍 Начато отслеживание вашей локации. Ожидаем назначения задачи...');
                }
            }

            // Обновляем heartbeat
            locationService.updateLastLocationTime(telegramId);

            // Сохраняем позицию с валидацией координат
            const coords = fromTelegram(location);
            if (coords) {
                const saveResult = await locationService.savePosition(
                    user.id,
                    activeSession.id,
                    coords[0], // latitude
                    coords[1], // longitude
                    new Date()
                );

                // Обрабатываем результат валидации
                if (!saveResult.saved) {
                    console.log(`🚫 Position rejected for user ${user.id}: ${saveResult.validation.reason}`);
                    
                    // Уведомляем пользователя о проблемах с GPS
                    if (saveResult.validation.riskLevel === 'HIGH') {
                        await ctx.reply(
                            '⚠️ Обнаружены подозрительные координаты GPS!\n\n' +
                            '🔍 Возможные причины:\n' +
                            '• Помехи GPS в данной зоне\n' +
                            '• Проблемы с геолокацией устройства\n\n' +
                            '📍 Пожалуйста, убедитесь что GPS включен и попробуйте переместиться в место с лучшим сигналом.'
                        );
                    }
                } else if (saveResult.validation && saveResult.validation.warnings.length > 0) {
                    console.log(`⚠️ Position saved with warnings for user ${user.id}: ${saveResult.validation.warnings.join(', ')}`);
                    console.log(`✅ Position saved for user ${user.id}, session ${activeSession.id}`);
                } else {
                    console.log(`✅ Position saved for user ${user.id}, session ${activeSession.id}`);
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
                const activeTask = await locationService.getUserActiveTask(user.id);
                activeSession = await locationService.createSession(user.id, activeTask ? activeTask.id : null);
                console.log(`✅ Created new session ${activeSession.id} for user ${user.id}${activeTask ? ` with task ${activeTask.id}` : ''}`);
            } else if (!activeSession.is_active) {
                await locationService.reactivateSession(activeSession.id);
            }

            // Сохраняем позицию с валидацией координат
            const coords = fromTelegram(location);
            if (coords) {
                const saveResult = await locationService.savePosition(
                    user.id,
                    activeSession.id,
                    coords[0], // latitude
                    coords[1], // longitude
                    new Date()
                );

                // Обрабатываем результат валидации
                if (!saveResult.saved) {
                    console.log(`🚫 Position rejected for user ${user.id}: ${saveResult.validation.reason}`);
                    
                    // Уведомляем пользователя о проблемах с GPS
                    if (saveResult.validation.riskLevel === 'HIGH') {
                        await ctx.reply(
                            '⚠️ Обнаружены подозрительные координаты GPS!\n\n' +
                            '🔍 Возможные причины:\n' +
                            '• Помехи GPS в данной зоне\n' +
                            '• Проблемы с геолокацией устройства\n\n' +
                            '📍 Пожалуйста, убедитесь что GPS включен и попробуйте переместиться в место с лучшим сигналом.'
                        );
                    }
                } else if (saveResult.validation && saveResult.validation.warnings.length > 0) {
                    console.log(`⚠️ Position saved with warnings for user ${user.id}: ${saveResult.validation.warnings.join(', ')}`);
                    console.log(`✅ Position saved for user ${user.id}, session ${activeSession.id}`);
                } else {
                    console.log(`✅ Position saved for user ${user.id}, session ${activeSession.id}`);
                }
            }
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