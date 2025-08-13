const fetch = require('node-fetch');
const crypto = require('crypto');
const config = require('../config');
const { createWebAppKeyboard, getWebAppUrl } = require('./webapp');

/**
 * Отправляет сообщение пользователю через Telegram Bot API
 * @param {number} chatId - ID чата пользователя
 * @param {string} message - Текст сообщения
 * @param {Object} options - Дополнительные опции (parse_mode, reply_markup и т.д.)
 * @returns {Promise<Object>} - Результат отправки
 */
const sendTelegramMessage = async (chatId, message, options = {}) => {
    try {
        console.log('📤 sendTelegramMessage called');
        console.log('📱 Chat ID:', chatId);
        console.log('🔑 Bot token exists:', !!config.telegram.botToken);
        
        const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
        console.log('🌐 Telegram API URL:', url);
        
        const payload = {
            chat_id: chatId,
            text: message,
            ...options
        };

        console.log('📦 Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

        const result = await response.json();
        console.log('📡 Response body:', result);
        
        if (!result.ok) {
            console.error('❌ Telegram API error:', result.description);
            throw new Error(`Telegram API error: ${result.description}`);
        }

        console.log('✅ Telegram message sent successfully');
        return result;
    } catch (error) {
        console.error('❌ Error sending message to Telegram:', error);
        throw error;
    }
};

/**
 * Отправляет сообщение об успешной регистрации
 * @param {number} telegramId - Telegram ID пользователя
 * @param {string} fullName - Полное имя пользователя
 * @returns {Promise<Object>} - Результат отправки
 */
const sendRegistrationSuccessMessage = async (telegramId, fullName) => {
    const message = `🎉 Добро пожаловать, ${fullName}!

✅ Ваша регистрация успешно завершена!

Теперь вы можете:
• Получать уведомления о задачах
• Отправлять отчеты о выполнении
• Отслеживать свой прогресс

📱 **Доступ к мини-приложению:**
Для полного доступа к функциям используйте мини-приложение через кнопку ниже.`;

    const options = {
        reply_markup: createWebAppKeyboard('/my-app')
    };

    return sendTelegramMessage(telegramId, message, options);
};

/**
 * Отправляет сообщение об ошибке регистрации
 * @param {number} telegramId - Telegram ID пользователя
 * @param {string} errorMessage - Сообщение об ошибке
 * @returns {Promise<Object>} - Результат отправки
 */
const sendRegistrationErrorMessage = async (telegramId, errorMessage) => {
    const message = `❌ Ошибка регистрации

${errorMessage}

Пожалуйста, проверьте правильность инвайт-кода и попробуйте снова.`;

    return sendTelegramMessage(telegramId, message);
};

/**
 * Отправляет уведомление о назначенной задаче конкретному пользователю
 * @param {number} telegramId - Telegram ID пользователя
 * @param {Object} task - Объект задачи
 * @returns {Promise<Object>} - Результат отправки
 */
const sendAssignedTaskNotification = async (telegramId, task) => {
    const message = `📋 Вам назначена новая задача!

📌 Название: ${task.title}
📝 Описание: ${task.description}
📅 Срок: ${task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Не указан'}

Для управления задачей нажмите кнопку ниже.`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '📋 Открыть задачу',
                        web_app: { url: getWebAppUrl(`/my-app/task-details/${task.id}`) }
                    }
                ]
            ]
        }
    };

    return sendTelegramMessage(telegramId, message, options);
};

/**
 * Отправляет уведомление о новой неназначенной задаче всем сотрудникам компании
 * @param {number[]} telegramIds - Массив Telegram ID пользователей
 * @param {Object} task - Объект задачи
 * @returns {Promise<Object[]>} - Результаты отправки
 */
const sendNotAssignedTaskNotification = async (telegramIds, task) => {
    const message = `🔔 Доступна новая задача!

📌 Название: ${task.title}
📝 Описание: ${task.description}
📅 Срок: ${task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Не указан'}

Для принятия задачи нажмите кнопку ниже.`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '📋 Открыть задачу',
                        web_app: { url: getWebAppUrl(`/my-app/task-details/${task.id}`) }
                    }
                ]
            ]
        }
    };

    return Promise.all(telegramIds.map(telegramId => 
        sendTelegramMessage(telegramId, message, options)
    ));
};

/**
 * Отправляет уведомление о снятии с задачи
 * @param {number} telegramId - Telegram ID пользователя
 * @param {Object} task - Объект задачи
 * @returns {Promise<Object>} - Результат отправки
 */
const sendTaskRemovedNotification = async (telegramId, task) => {
    const message = `❌ Вы сняты с задачи

📌 Название: ${task.title}
📝 Описание: ${task.description}
📅 Срок: ${task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Не указан'}

Задача была передана другому сотруднику.`;

    // Не добавляем кнопку "Открыть задачу" - задача больше не доступна
    const options = {};

    return sendTelegramMessage(telegramId, message, options);
};

/**
 * Отправляет уведомление об изменении задачи конкретному пользователю
 * @param {number} telegramId - Telegram ID пользователя
 * @param {Object} task - Объект задачи
 * @param {Object} changes - Объект с изменениями
 * @returns {Promise<Object>} - Результат отправки
 */
const sendTaskUpdateNotification = async (telegramId, task, changes) => {
    console.log('📤 sendTaskUpdateNotification called');
    console.log('📱 Telegram ID:', telegramId);
    console.log('📋 Task:', task.title);
    console.log('🔄 Changes object:', changes);
    console.log('🔄 Changes keys:', Object.keys(changes));
    console.log('🔑 Bot token exists:', !!config.telegram.botToken);
    
    let changesText = '';
    
    // Объект changes уже содержит только реальные изменения
    // поэтому просто отображаем все поля, которые есть в объекте
    console.log('🔍 Building changes text...');
    if (changes.title !== undefined) {
        changesText += `• Название: "${changes.title}"\n`;
        console.log('✅ Added title to changes text');
    }
    if (changes.description !== undefined) {
        changesText += `• Описание: "${changes.description}"\n`;
        console.log('✅ Added description to changes text');
    }
    if (changes.address !== undefined) {
        changesText += `• Адрес: "${changes.address}"\n`;
        console.log('✅ Added address to changes text');
    }
    if (changes.start_date !== undefined) {
        changesText += `• Дата начала: ${new Date(changes.start_date).toLocaleDateString()}\n`;
        console.log('✅ Added start_date to changes text');
    }
    if (changes.end_date !== undefined) {
        changesText += `• Дедлайн: ${new Date(changes.end_date).toLocaleDateString()}\n`;
        console.log('✅ Added end_date to changes text');
    }
    // Убираем "Требует проверки" из уведомлений - это внутренняя логика
    // if (changes.requires_verification !== undefined) {
    //     changesText += `• Требует проверки: ${changes.requires_verification ? 'Да' : 'Нет'}\n`;
    //     console.log('✅ Added requires_verification to changes text');
    // }
    if (changes.assigned_to !== undefined) {
        // Если assigned_to пустой или null, значит пользователь снят с задачи
        if (!changes.assigned_to) {
            changesText += `• Назначена: Снята с задачи\n`;
            console.log('✅ Added "removed from task" to changes text');
        } else {
            changesText += `• Назначена: ${changes.assigned_to}\n`;
            console.log('✅ Added assigned_to to changes text');
        }
    }
    if (changes.status !== undefined) {
        changesText += `• Статус: ${changes.status}\n`;
        console.log('✅ Added status to changes text');
    }
    console.log('📝 Final changes text:', changesText);

    const message = `📝 Задача была изменена!

📌 Название: ${task.title}
📝 Описание: ${task.description}
📅 Срок: ${task.end_date ? new Date(task.end_date).toLocaleDateString() : 'Не указан'}

🔄 Изменения:
${changesText}

Для просмотра задачи нажмите кнопку ниже.`;

    console.log('📝 Message to send:', message);

    // Определяем, нужно ли показывать кнопку "Открыть задачу"
    // Не показываем кнопку, если пользователь снят с задачи (assigned_to = null)
    const showButton = changes.assigned_to !== null;
    
    const options = {};
    if (showButton) {
        options.reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: '📋 Открыть задачу',
                        web_app: { url: getWebAppUrl(`/my-app/task-details/${task.id}`) }
                    }
                ]
            ]
        };
    }

    console.log('🔗 Web app URL:', getWebAppUrl(`/my-app/task-details/${task.id}`));
    console.log('📦 Final payload:', JSON.stringify({
        chat_id: telegramId,
        text: message,
        reply_markup: options.reply_markup
    }, null, 2));

    try {
        const result = await sendTelegramMessage(telegramId, message, options);
        console.log('✅ Telegram message sent successfully:', result);
        return result;
    } catch (error) {
        console.error('❌ Error sending Telegram message:', error);
        throw error;
    }
};

/**
 * Verify Telegram Web App initData
 * @param {string} initData - Raw initData string from Telegram Web App
 * @returns {boolean} - Whether the data is valid
 */
const verifyTelegramWebAppData = (initData) => {
  try {
    console.log('=== VERIFYING TELEGRAM WEB APP DATA ===');
    console.log('InitData:', initData);
    console.log('Bot token exists:', !!config.telegram.botToken);
    
    // Get data-check-string
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');
    
    console.log('Hash from initData:', hash);
    console.log('URL params:', Object.fromEntries(urlParams.entries()));
    
    // Generate data-check-string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    console.log('Data check string:', dataCheckString);

    // Generate secret key (as per Telegram docs)
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(config.telegram.botToken)
      .digest();

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    console.log('Calculated hash:', calculatedHash);
    console.log('Hash match:', calculatedHash === hash);
    
    return calculatedHash === hash;
  } catch (error) {
    console.error('Error verifying Telegram Web App data:', error);
    return false;
  }
};

module.exports = {
    sendTelegramMessage,
    sendRegistrationSuccessMessage,
    sendRegistrationErrorMessage,
    sendAssignedTaskNotification,
    sendNotAssignedTaskNotification,
    sendTaskRemovedNotification,
    sendTaskUpdateNotification,
    verifyTelegramWebAppData
}; 