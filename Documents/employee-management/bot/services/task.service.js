const db = require('../db');

class TaskService {
    /**
     * Получить задачи пользователя
     * @param {number} userId - ID пользователя
     * @returns {Promise<Array>} - Массив задач
     */
    async getUserTasks(userId) {
        try {
            const query = `
                SELECT t.id, t.title, t.description, t.status, t.start_date, t.end_date,
                       t.requires_verification, t.created_at,
                       c.name as company_name
                FROM tasks t
                JOIN companies c ON t.company_id = c.id
                WHERE t.assigned_to = $1
                ORDER BY t.created_at DESC
            `;
            
            const result = await db.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error in getUserTasks:', error);
            throw error;
        }
    }

    /**
     * Получить задачи по компании
     * @param {number} companyId - ID компании
     * @returns {Promise<Array>} - Массив задач
     */
    async getCompanyTasks(companyId) {
        try {
            const query = `
                SELECT t.id, t.title, t.description, t.status, t.start_date, t.end_date,
                       t.requires_verification, t.created_at,
                       u.full_name as assigned_to_name
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE t.company_id = $1
                ORDER BY t.created_at DESC
            `;
            
            const result = await db.query(query, [companyId]);
            return result.rows;
        } catch (error) {
            console.error('❌ Error in getCompanyTasks:', error);
            throw error;
        }
    }

    /**
     * Получить задачу по ID
     * @param {number} taskId - ID задачи
     * @returns {Promise<Object|null>} - Данные задачи или null
     */
    async getTaskById(taskId) {
        try {
            const query = `
                SELECT t.id, t.title, t.description, t.status, t.start_date, t.end_date,
                       t.requires_verification, t.created_at, t.updated_at,
                       c.name as company_name,
                       u.full_name as assigned_to_name,
                       creator.full_name as created_by_name
                FROM tasks t
                JOIN companies c ON t.company_id = c.id
                LEFT JOIN users u ON t.assigned_to = u.id
                JOIN users creator ON t.created_by = creator.id
                WHERE t.id = $1
            `;
            
            const result = await db.query(query, [taskId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            console.error('❌ Error in getTaskById:', error);
            throw error;
        }
    }

    /**
     * Получить количество задач пользователя по статусу
     * @param {number} userId - ID пользователя
     * @param {string} status - Статус задач (опционально)
     * @returns {Promise<number>} - Количество задач
     */
    async getUserTasksCount(userId, status = null) {
        try {
            let query = `
                SELECT COUNT(*) as count
                FROM tasks 
                WHERE assigned_to = $1
            `;
            let params = [userId];
            
            if (status) {
                query += ` AND status = $2`;
                params.push(status);
            }
            
            const result = await db.query(query, params);
            return parseInt(result.rows[0].count);
        } catch (error) {
            console.error('❌ Error in getUserTasksCount:', error);
            throw error;
        }
    }

    /**
     * Обновить статус задачи
     * @param {number} taskId - ID задачи
     * @param {string} status - Новый статус
     * @param {number} userId - ID пользователя, который берет задачу
     * @returns {Promise<Object>} - Обновленная задача
     */
    async updateTaskStatus(taskId, status, userId) {
        try {
            const query = `
                UPDATE tasks
                SET status = $1,
                    assigned_to = $2,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;
            
            const result = await db.query(query, [status, userId, taskId]);
            return result.rows[0];
        } catch (error) {
            console.error('❌ Error in updateTaskStatus:', error);
            throw error;
        }
    }
}

module.exports = new TaskService(); 