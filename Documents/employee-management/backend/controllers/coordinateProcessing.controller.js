/**
 * Контроллер для обработки координат
 * Предоставляет API для получения обработанных координат и статистики
 */

const coordinateProcessingService = require('../services/coordinateProcessing.service');
const db = require('../db');

const coordinateProcessingController = {
    /**
     * Получить обработанные координаты сессии
     */
    async getSessionProcessedCoordinates(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { sessionId } = req.params;
            
            if (!sessionId || isNaN(parseInt(sessionId))) {
                return res.status(400).json({ message: 'Неверный ID сессии' });
            }

            // Проверяем права доступа к сессии
            const sessionCheck = await db.query(
                'SELECT user_id FROM sessions WHERE id = $1',
                [sessionId]
            );

            if (sessionCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Сессия не найдена' });
            }

            const sessionUserId = sessionCheck.rows[0].user_id;
            
            // Пользователь может видеть только свои сессии или сессии сотрудников своей компании (если он менеджер)
            if (sessionUserId !== req.user.id && req.user.role !== 'manager') {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра этой сессии' });
            }

            // Если менеджер, проверяем что сотрудник из той же компании
            if (req.user.role === 'manager' && sessionUserId !== req.user.id) {
                const employeeCheck = await db.query(
                    'SELECT id FROM users WHERE id = $1 AND company_id = $2',
                    [sessionUserId, req.user.company_id]
                );

                if (employeeCheck.rows.length === 0) {
                    return res.status(403).json({ message: 'Сотрудник не найден в вашей компании' });
                }
            }

            const coordinates = await coordinateProcessingService.getProcessedCoordinatesForMap(sessionId);
            
            res.json({
                sessionId: parseInt(sessionId),
                coordinates,
                count: coordinates.length
            });
        } catch (error) {
            console.error('Error getting session processed coordinates:', error);
            res.status(500).json({ message: 'Ошибка при получении обработанных координат сессии' });
        }
    },

    /**
     * Получить статистику сессии
     */
    async getSessionStats(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { sessionId } = req.params;
            
            if (!sessionId || isNaN(parseInt(sessionId))) {
                return res.status(400).json({ message: 'Неверный ID сессии' });
            }

            // Проверяем права доступа к сессии
            const sessionCheck = await db.query(
                'SELECT user_id FROM sessions WHERE id = $1',
                [sessionId]
            );

            if (sessionCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Сессия не найдена' });
            }

            const sessionUserId = sessionCheck.rows[0].user_id;
            
            // Пользователь может видеть только свои сессии или сессии сотрудников своей компании (если он менеджер)
            if (sessionUserId !== req.user.id && req.user.role !== 'manager') {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра этой сессии' });
            }

            // Если менеджер, проверяем что сотрудник из той же компании
            if (req.user.role === 'manager' && sessionUserId !== req.user.id) {
                const employeeCheck = await db.query(
                    'SELECT id FROM users WHERE id = $1 AND company_id = $2',
                    [sessionUserId, req.user.company_id]
                );

                if (employeeCheck.rows.length === 0) {
                    return res.status(403).json({ message: 'Сотрудник не найден в вашей компании' });
                }
            }

            const stats = await coordinateProcessingService.getSessionStats(sessionId);
            
            res.json(stats);
        } catch (error) {
            console.error('Error getting session stats:', error);
            res.status(500).json({ message: 'Ошибка при получении статистики сессии' });
        }
    },

    /**
     * Получить обработанные координаты задачи
     */
    async getTaskProcessedCoordinates(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { taskId } = req.params;
            
            if (!taskId || isNaN(parseInt(taskId))) {
                return res.status(400).json({ message: 'Неверный ID задачи' });
            }

            // Проверяем права доступа к задаче
            const taskCheck = await db.query(
                'SELECT company_id, assigned_to FROM tasks WHERE id = $1',
                [taskId]
            );

            if (taskCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена' });
            }

            const task = taskCheck.rows[0];
            
            // Пользователь может видеть только задачи своей компании
            if (task.company_id !== req.user.company_id) {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра этой задачи' });
            }

            // Если не менеджер, может видеть только свои задачи
            if (req.user.role !== 'manager' && task.assigned_to !== req.user.id) {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра этой задачи' });
            }

            const coordinates = await coordinateProcessingService.getTaskProcessedCoordinates(taskId);
            
            res.json({
                taskId: parseInt(taskId),
                coordinates,
                count: coordinates.length
            });
        } catch (error) {
            console.error('Error getting task processed coordinates:', error);
            res.status(500).json({ message: 'Ошибка при получении обработанных координат задачи' });
        }
    },

    /**
     * Получить статистику задачи
     */
    async getTaskStats(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { taskId } = req.params;
            
            if (!taskId || isNaN(parseInt(taskId))) {
                return res.status(400).json({ message: 'Неверный ID задачи' });
            }

            // Проверяем права доступа к задаче
            const taskCheck = await db.query(
                'SELECT company_id, assigned_to FROM tasks WHERE id = $1',
                [taskId]
            );

            if (taskCheck.rows.length === 0) {
                return res.status(404).json({ message: 'Задача не найдена' });
            }

            const task = taskCheck.rows[0];
            
            // Пользователь может видеть только задачи своей компании
            if (task.company_id !== req.user.company_id) {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра этой задачи' });
            }

            // Если не менеджер, может видеть только свои задачи
            if (req.user.role !== 'manager' && task.assigned_to !== req.user.id) {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра этой задачи' });
            }

            const stats = await coordinateProcessingService.getTaskStats(taskId);
            
            res.json(stats);
        } catch (error) {
            console.error('Error getting task stats:', error);
            res.status(500).json({ message: 'Ошибка при получении статистики задачи' });
        }
    },

    /**
     * Обновить настройки обработки координат (только для менеджеров)
     */
    async updateProcessingSettings(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            if (req.user.role !== 'manager') {
                return res.status(403).json({ message: 'Недостаточно прав для изменения настроек' });
            }

            const {
                maxSpeedKmh,
                minSpeedKmh,
                clusterRadiusMeters,
                timeWindowMs,
                minPointsForMedian
            } = req.body;

            // Валидация параметров
            const settings = {};
            
            if (maxSpeedKmh !== undefined) {
                if (maxSpeedKmh < 1 || maxSpeedKmh > 500) {
                    return res.status(400).json({ message: 'Максимальная скорость должна быть от 1 до 500 км/ч' });
                }
                settings.maxSpeedKmh = maxSpeedKmh;
            }

            if (minSpeedKmh !== undefined) {
                if (minSpeedKmh < 0 || minSpeedKmh > 50) {
                    return res.status(400).json({ message: 'Минимальная скорость должна быть от 0 до 50 км/ч' });
                }
                settings.minSpeedKmh = minSpeedKmh;
            }

            if (clusterRadiusMeters !== undefined) {
                if (clusterRadiusMeters < 1 || clusterRadiusMeters > 1000) {
                    return res.status(400).json({ message: 'Радиус кластера должен быть от 1 до 1000 метров' });
                }
                settings.clusterRadiusMeters = clusterRadiusMeters;
            }

            if (timeWindowMs !== undefined) {
                if (timeWindowMs < 1000 || timeWindowMs > 300000) {
                    return res.status(400).json({ message: 'Временное окно должно быть от 1 до 300 секунд' });
                }
                settings.timeWindowMs = timeWindowMs;
            }

            if (minPointsForMedian !== undefined) {
                if (minPointsForMedian < 1 || minPointsForMedian > 10) {
                    return res.status(400).json({ message: 'Минимальное количество точек должно быть от 1 до 10' });
                }
                settings.minPointsForMedian = minPointsForMedian;
            }

            // Обновляем настройки
            coordinateProcessingService.updateProcessorSettings(settings);
            
            res.json({
                message: 'Настройки обработки координат обновлены',
                settings
            });
        } catch (error) {
            console.error('Error updating processing settings:', error);
            res.status(500).json({ message: 'Ошибка при обновлении настроек обработки' });
        }
    },

    /**
     * Получить обработанные координаты сессий за период
     */
    async getSessionsProcessedCoordinates(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const { userId, startDate, endDate } = req.query;
            
            if (!userId || !startDate || !endDate) {
                return res.status(400).json({ message: 'Необходимы параметры userId, startDate, endDate' });
            }

            // Проверяем права доступа
            if (parseInt(userId) !== req.user.id && req.user.role !== 'manager') {
                return res.status(403).json({ message: 'Недостаточно прав для просмотра данных другого пользователя' });
            }

            // Если менеджер, проверяем что сотрудник из той же компании
            if (req.user.role === 'manager' && parseInt(userId) !== req.user.id) {
                const employeeCheck = await db.query(
                    'SELECT id FROM users WHERE id = $1 AND company_id = $2',
                    [userId, req.user.company_id]
                );

                if (employeeCheck.rows.length === 0) {
                    return res.status(403).json({ message: 'Сотрудник не найден в вашей компании' });
                }
            }

            const coordinates = await coordinateProcessingService.getSessionsProcessedCoordinatesForPeriod(
                parseInt(userId),
                new Date(startDate),
                new Date(endDate)
            );
            
            res.json({
                userId: parseInt(userId),
                startDate,
                endDate,
                coordinates,
                count: coordinates.length
            });
        } catch (error) {
            console.error('Error getting sessions processed coordinates:', error);
            res.status(500).json({ message: 'Ошибка при получении обработанных координат сессий' });
        }
    },

    /**
     * Получить текущие настройки обработки координат
     */
    async getProcessingSettings(req, res) {
        try {
            if (!req.user?.id) {
                return res.status(401).json({ message: 'Требуется авторизация' });
            }

            const settings = {
                maxSpeedKmh: coordinateProcessingService.processor.maxSpeedKmh,
                minSpeedKmh: coordinateProcessingService.processor.minSpeedKmh,
                clusterRadiusMeters: coordinateProcessingService.processor.clusterRadiusMeters,
                timeWindowMs: coordinateProcessingService.processor.timeWindowMs,
                minPointsForMedian: coordinateProcessingService.processor.minPointsForMedian
            };
            
            res.json(settings);
        } catch (error) {
            console.error('Error getting processing settings:', error);
            res.status(500).json({ message: 'Ошибка при получении настроек обработки' });
        }
    }
};

module.exports = coordinateProcessingController; 