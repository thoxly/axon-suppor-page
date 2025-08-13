const fsm = require('../fsm.handler');
const userService = require('../../services/user.service');

const leaveConfirmationHandler = async (ctx, state) => {
    const text = ctx.message.text.trim();
    
    if (text.toLowerCase() === 'да') {
        try {
            const telegramId = ctx.from.id;
            
            // Пометка пользователя на удаление
            const result = await userService.markUserForDeletion(telegramId);
            
            // Очищаем состояние FSM
            await fsm.clearState(ctx);
            
            return ctx.reply(`✅ Вы успешно покинули компанию!

👤 Ваш аккаунт был деактивирован и помечен на удаление.

📝 Если вы захотите вернуться, обратитесь к администратору другойкомпании для повторной регистрации.

До свидания! 👋`);
        } catch (error) {
            console.error('❌ Error в leave confirmation:', error);
            await fsm.clearState(ctx);
            return ctx.reply('❌ Произошла ошибка при выходе из компании. Пожалуйста, попробуйте позже или обратитесь к администратору.');
        }
    } else if (text.toLowerCase() === 'нет' || text.toLowerCase() === 'отмена') {
        // Отмена операции
        await fsm.clearState(ctx);
        return ctx.reply('🔄 Операция отменена. Вы остаетесь в компании.');
    } else {
        // Неверный ответ
        return ctx.reply('❌ Пожалуйста, ответьте "да" для подтверждения выхода из компании или "нет" для отмены.');
    }
};

module.exports = leaveConfirmationHandler; 