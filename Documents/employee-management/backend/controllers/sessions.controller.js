const db = require('../db');

const sessionsController = {
    // Получение активной сессии пользователя
    async getActiveSession(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const query = `
                SELECT id, user_id, task_id, start_time, end_time, is_active, created_at, updated_at
                FROM sessions 
                WHERE user_id = $1 AND is_active = true
                ORDER BY start_time DESC
                LIMIT 1
            `;
            
            const { rows } = await db.query(query, [req.user.id]);
            
            if (rows.length === 0) {
                return res.json({ 
                    hasActiveSession: false,
                    session: null 
                });
            }

            res.json({ 
                hasActiveSession: true,
                session: rows[0] 
            });
        } catch (error) {
            console.error('Error getting active session:', error);
            res.status(500).json({ message: 'Ошибка при получении активной сессии' });
        }
    },

    // Получение последних позиций пользователя
    async getUserPositions(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { limit = 10, sessionId } = req.query;

            let query = `
                SELECT 
                    p.latitude,
                    p.longitude,
                    p.timestamp,
                    s.id as session_id,
                    t.title as task_title,
                    t.id as task_id
                FROM positions p
                JOIN sessions s ON p.session_id = s.id
                LEFT JOIN tasks t ON s.task_id = t.id
                WHERE p.user_id = $1
            `;

            const queryParams = [req.user.id];

            // Если указан sessionId, добавляем фильтр по сессии
            if (sessionId) {
                query += ` AND s.id = $2`;
                queryParams.push(sessionId);
            }

            query += ` ORDER BY p.timestamp DESC LIMIT $${queryParams.length + 1}`;
            queryParams.push(parseInt(limit));
            
            const { rows } = await db.query(query, queryParams);
            
            res.json({
                positions: rows,
                count: rows.length
            });
        } catch (error) {
            console.error('Error getting user positions:', error);
            res.status(500).json({ message: 'Ошибка при получении позиций пользователя' });
        }
    },

    // Получение текущей позиции пользователя (последняя активная сессия)
    async getCurrentPosition(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const query = `
                SELECT 
                    p.latitude,
                    p.longitude,
                    p.timestamp,
                    s.id as session_id,
                    s.is_active,
                    t.title as task_title,
                    t.id as task_id,
                    t.status as task_status
                FROM positions p
                JOIN sessions s ON p.session_id = s.id
                LEFT JOIN tasks t ON s.task_id = t.id
                WHERE p.user_id = $1 AND s.is_active = true
                ORDER BY p.timestamp DESC
                LIMIT 1
            `;
            
            const { rows } = await db.query(query, [req.user.id]);
            
            if (rows.length === 0) {
                return res.json({ 
                    hasPosition: false,
                    position: null 
                });
            }

            res.json({ 
                hasPosition: true,
                position: rows[0] 
            });
        } catch (error) {
            console.error('Error getting current position:', error);
            res.status(500).json({ message: 'Ошибка при получении текущей позиции' });
        }
    },

    // Создание новой сессии
    async createSession(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { taskId } = req.body;

            const query = `
                INSERT INTO sessions (user_id, task_id, start_time, is_active)
                VALUES ($1, $2, CURRENT_TIMESTAMP, true)
                RETURNING id, user_id, task_id, start_time, is_active, created_at, updated_at
            `;
            
            const { rows } = await db.query(query, [req.user.id, taskId]);
            
            res.json(rows[0]);
        } catch (error) {
            console.error('Error creating session:', error);
            res.status(500).json({ message: 'Ошибка при создании сессии' });
        }
    },

    // Деактивация сессии
    async deactivateSession(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { id } = req.params;

            const query = `
                UPDATE sessions 
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND user_id = $2
                RETURNING id, user_id, task_id, start_time, is_active, created_at, updated_at
            `;
            
            const { rows } = await db.query(query, [id, req.user.id]);
            
            if (rows.length === 0) {
                return res.status(404).json({ message: 'Сессия не найдена' });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error('Error deactivating session:', error);
            res.status(500).json({ message: 'Ошибка при деактивации сессии' });
        }
    }
};

module.exports = sessionsController; 