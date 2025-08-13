const fsm = require('../fsm.handler');
const userService = require('../../services/user.service');

const leaveHandler = async (ctx, state) => {
    try {
        const telegramId = ctx.from.id;
        
        // Получаем информацию о пользователе и его компании
        const user = await userService.getUserByTelegramId(telegramId);
        
        if (!user) {
            return ctx.reply('❌ Вы не зарегистрированы в системе. Используйте /start для регистрации.');
        }
        
        if (!user.company_id) {
            return ctx.reply('❌ Вы не состоите в компании.');
        }
        
        // Получаем информацию о компании
        const companyInfo = await userService.getUserCompanyInfo(telegramId);
        
        if (!companyInfo) {
            return ctx.reply('❌ Не удалось получить информацию о компании.');
        }
        
        // Переходим в состояние подтверждения выхода
        await fsm.transition(ctx, 'LEAVE_CONFIRMATION', { 
            companyId: companyInfo.id,
            companyName: companyInfo.name 
        });
        
        return ctx.reply(`⚠️ Вы собираетесь покинуть компанию "${companyInfo.name}" (ID: ${companyInfo.id})

❗️ Это действие нельзя отменить. Ваш аккаунт будет деактивирован и помечен на удаление.

Вы уверены в данном действии? Если да, то введите текстом "да".`);
        
    } catch (error) {
        console.error('❌ Error in leave command:', error);
        return ctx.reply('❌ Произошла ошибка при обработке команды. Пожалуйста, попробуйте позже.');
    }
};

module.exports = leaveHandler; 