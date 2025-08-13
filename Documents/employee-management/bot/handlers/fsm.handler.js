const stateService = require('../services/state.service');
const fetch = require('node-fetch');
const userService = require('../services/user.service'); // Added missing import

class FSMHandler {
    constructor() {
        this.states = {};
        this.commands = {};
        console.log('🔄 FSM Handler initialized');
    }

    // Register state handler
    state(stateName, handler) {
        console.log('📝 Registering state handler:', stateName);
        this.states[stateName] = handler;
        return this;
    }

    // Register command handler
    command(commandName, handler) {
        console.log('📝 Registering command handler:', commandName);
        this.commands[commandName] = {
            handler
        };
        return this;
    }

    // Handle incoming update
    async handleUpdate(ctx) {
        const userId = ctx.from.id;
        console.log('👤 Processing update for user:', userId);
        
        const currentState = await stateService.getUserState(userId);
        console.log('🔍 Current user state:', currentState?.state || 'NO_STATE');

        // Handle commands first
        if (ctx.message?.text?.startsWith('/')) {
            const command = ctx.message.text.split(' ')[0].substring(1);
            console.log('🎯 Detected command:', command);
            
            if (this.commands[command]) {
                console.log('✨ Found handler for command:', command);
                const { handler } = this.commands[command];
                
                // Clear current state before handling command
                if (currentState) {
                    await this.clearState(ctx);
                }
                
                // Execute command handler
                return await handler(ctx, null);
            } else {
                console.log('❌ No handler found for command:', command);
                return await ctx.reply('❌ Неизвестная команда. Используйте доступные команды.');
            }
        }

        // Handle state if no command matched
        if (currentState && this.states[currentState.state]) {
            console.log('🔄 Processing state handler for:', currentState.state);
            return await this.states[currentState.state](ctx, currentState);
        }

        // Handle invite code for unregistered users
        if (!currentState && ctx.message?.text && !ctx.message.text.startsWith('/')) {
            console.log('🔑 Processing potential invite code');
            const user = await userService.getUserByTelegramId(ctx.from.id);
            
            if (user) {
                // User is registered but not in any state
                const manager = user.manager_telegram_username || user.manager_email;
                const contactInfo = manager ? 
                    `Ваш менеджер: ${user.manager_telegram_username ? '@' + user.manager_telegram_username : user.manager_email}` :
                    'Обратитесь к администратору системы';
                
                return await ctx.reply(`👋 Для получения помощи обратитесь к вашему менеджеру.\n\n${contactInfo}`);
            } else {
                // Unregistered user - handle invite code
                return await this.handleInviteCode(ctx);
            }
        }

        // Default handler for stateless messages
        console.log('➡️ Using default stateless message handler');
        return await this.handleStatelessMessage(ctx);
    }

    // Handle messages when no state is set
    async handleStatelessMessage(ctx) {
        const user = await userService.getUserByTelegramId(ctx.from.id);
        
        if (user) {
            const manager = user.manager_telegram_username || user.manager_email;
            const contactInfo = manager ? 
                `Ваш менеджер: ${user.manager_telegram_username ? '@' + user.manager_telegram_username : user.manager_email}` :
                'Обратитесь к администратору системы';
            
            return await ctx.reply(`👋 Для получения помощи обратитесь к вашему менеджеру.\n\n${contactInfo}`);
        } else {
            return await ctx.reply('Для регистрации в системе отправьте ваш инвайт-код.');
        }
    }

    // Helper to transition to a new state
    async transition(ctx, newState) {
        const userId = ctx.from.id;
        console.log(`🔄 Transitioning user ${userId} to state:`, newState);
        await stateService.setState(userId, newState);
    }

    // Helper to clear state
    async clearState(ctx) {
        const userId = ctx.from.id;
        console.log(`🗑️ Clearing state for user:`, userId);
        await stateService.clearState(userId);
    }

    // Helper to update state data - этот метод больше не нужен, но оставим его для обратной совместимости
    async updateStateData(ctx, data) {
        const userId = ctx.from.id;
        console.log(`📝 Updating state data for user ${userId}:`, data);
        return await stateService.updateStateData(userId, data);
    }

    // Handle invite code for unregistered users
    async handleInviteCode(ctx) {
        const text = ctx.message.text.trim();
        const inviteCodePattern = /^[A-Za-z0-9]{6,20}$/;
        
        if (!inviteCodePattern.test(text)) {
            return ctx.reply('❌ Неверный формат инвайт-кода. Пожалуйста, проверьте код и попробуйте снова.');
        }

        const processingMsg = await ctx.reply('⏳ Проверяю инвайт-код...');
        
        try {
            // Получаем все доступные данные пользователя из Telegram
            const { id: telegramId, first_name: firstName, last_name: lastName, username, language_code, is_premium } = ctx.from;
            
            // Сначала проверяем существование и валидность инвайт-кода
            const backendUrl = `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/auth/validate-invite`;
            const validateResponse = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode: text })
            });

            const validateResult = await validateResponse.json();

            if (!validateResponse.ok) {
                await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
                return ctx.reply(`❌ ${validateResult.message || 'Ошибка проверки инвайт-кода'}`);
            }

            // Если инвайт-код валиден, регистрируем пользователя со всеми доступными данными
            const registerUrl = `${process.env.BACKEND_URL || 'http://localhost:3003'}/api/auth/register/invite`;
            const registerResponse = await fetch(registerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inviteCode: text,
                    telegramId,
                    firstName,
                    lastName,
                    username,
                    language_code,
                    is_premium,
                    // Добавляем все дополнительные поля, которые могут быть доступны
                    ...ctx.from
                })
            });

            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);

            const registerResult = await registerResponse.json();

            if (registerResponse.ok) {
                // Теперь пользователь зарегистрирован, можно сохранить состояние
                await this.transition(ctx, 'REGISTERED', { user: registerResult.user });

                // Сообщение об успешной регистрации будет отправлено из backend/controllers/auth.controller.js
                return ctx.reply('Регистрация успешно завершена!');
            } else {
                return ctx.reply(`❌ Ошибка регистрации

${registerResult.message}

Пожалуйста, проверьте правильность инвайт-кода и попробуйте снова.`);
            }
        } catch (error) {
            console.error('Error processing invite:', error);
            await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
            return ctx.reply('❌ Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.');
        }
    }
}

module.exports = new FSMHandler(); 