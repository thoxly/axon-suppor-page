const awaitingInviteHandler = async (ctx, state) => {
    // This state is no longer used since invite code processing
    // is now handled in the main FSM handler for unregistered users
    return ctx.reply('❌ Неожиданное состояние. Пожалуйста, используйте команду /start для начала работы.');
};

module.exports = awaitingInviteHandler; 