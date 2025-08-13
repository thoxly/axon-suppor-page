const db = require('../db');

class UserService {
    /**
     * Получить пользователя по Telegram ID
     * @param {number} telegramId - Telegram ID пользователя
     * @returns {Promise<Object|null>} - Данные пользователя или null
     */
    async getUserByTelegramId(telegramId) {
        try {
            const query = `
                SELECT u.id, u.full_name, u.company_id, c.name as company_name,
                       m.username as manager_telegram_username,
                       m.email as manager_email
                FROM users u 
                LEFT JOIN companies c ON u.company_id = c.id 
                LEFT JOIN users m ON u.manager_id = m.id
                WHERE u.telegram_id = $1 
                AND u.status != 'deleted'
                AND u.telegram_id > 0
            `;
            
            const result = await db.query(query, [telegramId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('❌ Error in getUserByTelegramId:', error);
            throw error;
        }
    }

    /**
     * Проверить, зарегистрирован ли пользователь
     * @param {number} telegramId - Telegram ID пользователя
     * @returns {Promise<boolean>} - true если пользователь зарегистрирован
     */
    async isUserRegistered(telegramId) {
        try {
            const user = await this.getUserByTelegramId(telegramId);
            return user !== null;
        } catch (error) {
            console.error('❌ Error in isUserRegistered:', error);
            throw error;
        }
    }

    /**
     * Получить информацию о компании пользователя
     * @param {number} telegramId - Telegram ID пользователя
     * @returns {Promise<Object|null>} - Информация о компании или null
     */
    async getUserCompanyInfo(telegramId) {
        try {
            const query = `
                SELECT c.id, c.name, c.inn, c.address
                FROM users u 
                JOIN companies c ON u.company_id = c.id 
                WHERE u.telegram_id = $1 AND u.status != 'deleted'
            `;
            
            const result = await db.query(query, [telegramId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('❌ Error in getUserCompanyInfo:', error);
            throw error;
        }
    }

    /**
     * Пометка пользователя на удаление из компании
     * @param {number} telegramId - Telegram ID пользователя
     * @returns {Promise<Object>} - Результат операции
     */
    async markUserForDeletion(telegramId) {
        try {
            const query = `
                UPDATE users 
                SET status = 'deleted',
                    updated_at = CURRENT_TIMESTAMP,
                    telegram_id = telegram_id + 9999999999999
                WHERE telegram_id = $1 AND status != 'deleted'
                RETURNING id, full_name, company_id
            `;
            
            const result = await db.query(query, [telegramId]);
            
            if (result.rows.length === 0) {
                throw new Error('Пользователь не найден или уже помечен на удаление');
            }
            
            return {
                success: true,
                user: result.rows[0]
            };
        } catch (error) {
            console.error('❌ Error in markUserForDeletion:', error);
            throw error;
        }
    }
}

module.exports = new UserService(); 