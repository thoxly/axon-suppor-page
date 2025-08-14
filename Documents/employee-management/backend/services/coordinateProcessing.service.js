/**
 * Сервис для обработки координат сессий
 * Интегрирует CoordinateProcessor с существующей системой
 */

const db = require('../db');
const CoordinateProcessor = require('../utils/coordinateProcessor');
const { fromDatabase } = require('../utils/coordinates');

class CoordinateProcessingService {
    constructor() {
        // Создаем процессор с адаптивным режимом
        this.processor = new CoordinateProcessor({
            enableAdaptiveMode: true, // включен адаптивный режим
            maxSpeedKmh: 100,        // максимальная скорость 100 км/ч (будет переопределена)
            minSpeedKmh: 0.1,        // минимальная скорость 0.1 км/ч (будет переопределена)
            clusterRadiusMeters: 20, // радиус кластера 20 метров (будет переопределен)
            timeWindowMs: 30000,     // временное окно 30 секунд (будет переопределено)
            minPointsForMedian: 3    // минимум 3 точки для медианы (будет переопределено)
        });
    }

    /**
     * Получает все позиции сессии из базы данных
     * @param {number} sessionId - ID сессии
     * @returns {Promise<Array>} - массив позиций
     */
    async getSessionPositions(sessionId) {
        try {
            const query = `
                SELECT
                    latitude,
                    longitude,
                    timestamp
                FROM positions
                WHERE session_id = $1
                ORDER BY timestamp ASC
            `;

            const { rows } = await db.query(query, [sessionId]);

            // Преобразуем в формат для процессора
            return rows.map(row => ({
                coords: fromDatabase(row),
                timestamp: new Date(row.timestamp)
            }));
        } catch (error) {
            console.error('❌ Error getting session positions:', error);
            throw error;
        }
    }

    /**
     * Обрабатывает координаты сессии
     * @param {number} sessionId - ID сессии
     * @returns {Promise<Object>} - результат обработки
     */
    async processSessionCoordinates(sessionId) {
        try {
            console.log(`🔄 Processing coordinates for session ${sessionId}`);

            // Получаем исходные позиции
            const originalPositions = await this.getSessionPositions(sessionId);

            if (originalPositions.length === 0) {
                return {
                    sessionId,
                    originalPositions: [],
                    processedPositions: [],
                    movementAnalysis: null,
                    validationSummary: null,
                    stats: {
                        originalCount: 0,
                        processedCount: 0,
                        reductionPercent: 0,
                        originalDistance: 0,
                        processedDistance: 0,
                        distanceChangePercent: 0
                    }
                };
            }

            // Получаем контекст задачи для валидации координат
            const validationContext = await this.getValidationContext(sessionId);

            // Обрабатываем координаты с адаптивным анализом и валидацией
            const result = this.processor.processCoordinates(originalPositions, validationContext);

            console.log(`✅ Session ${sessionId} processing completed:`, result.stats);
            if (result.movementAnalysis) {
                console.log(`🎯 Detected movement type: ${result.movementAnalysis.type} (confidence: ${(result.movementAnalysis.confidence * 100).toFixed(1)}%)`);
            }
            if (result.validationSummary) {
                console.log(`🔍 Validation summary: ${result.validationSummary.stats.rejected} rejected, ${result.validationSummary.stats.flagged} flagged`);
            }

            return {
                sessionId,
                originalPositions,
                processedPositions: result.processedPositions,
                movementAnalysis: result.movementAnalysis,
                validationSummary: result.validationSummary,
                stats: result.stats
            };
        } catch (error) {
            console.error(`❌ Error processing session ${sessionId} coordinates:`, error);
            throw error;
        }
    }

    /**
     * Обрабатывает координаты для нескольких сессий
     * @param {Array} sessionIds - массив ID сессий
     * @returns {Promise<Array>} - результаты обработки
     */
    async processMultipleSessions(sessionIds) {
        const results = [];

        for (const sessionId of sessionIds) {
            try {
                const result = await this.processSessionCoordinates(sessionId);
                results.push(result);
            } catch (error) {
                console.error(`❌ Error processing session ${sessionId}:`, error);
                results.push({
                    sessionId,
                    error: error.message,
                    originalPositions: [],
                    processedPositions: [],
                    movementAnalysis: null,
                    stats: null
                });
            }
        }

        return results;
    }

    /**
     * Получает обработанные координаты для отображения на карте
     * @param {number} sessionId - ID сессии
     * @returns {Promise<Array>} - массив обработанных координат для карты
     */
    async getProcessedCoordinatesForMap(sessionId) {
        try {
            const result = await this.processSessionCoordinates(sessionId);

            // Преобразуем в формат для карты
            return result.processedPositions.map(pos => ({
                latitude: pos.coords[0],
                longitude: pos.coords[1],
                timestamp: pos.timestamp,
                originalCount: pos.originalCount || 1
            }));
        } catch (error) {
            console.error(`❌ Error getting processed coordinates for map:`, error);
            throw error;
        }
    }

    /**
     * Получает статистику по сессии
     * @param {number} sessionId - ID сессии
     * @returns {Promise<Object>} - статистика сессии
     */
    async getSessionStats(sessionId) {
        try {
            const result = await this.processSessionCoordinates(sessionId);

            // Получаем дополнительную информацию о сессии
            const sessionQuery = `
                SELECT
                    s.id,
                    s.user_id,
                    s.task_id,
                    s.start_time,
                    s.end_time,
                    s.is_active,
                    u.full_name as user_name,
                    t.title as task_title
                FROM sessions s
                LEFT JOIN users u ON s.user_id = u.id
                LEFT JOIN tasks t ON s.task_id = t.id
                WHERE s.id = $1
            `;

            const { rows } = await db.query(sessionQuery, [sessionId]);
            const sessionInfo = rows[0];

            return {
                sessionInfo,
                processingStats: result.stats,
                movementAnalysis: result.movementAnalysis,
                originalCount: result.originalPositions.length,
                processedCount: result.processedPositions.length
            };
        } catch (error) {
            console.error(`❌ Error getting session stats:`, error);
            throw error;
        }
    }

    /**
     * Получает обработанные координаты для задачи
     * @param {number} taskId - ID задачи
     * @returns {Promise<Array>} - массив обработанных координат по всем сессиям задачи
     */
    async getTaskProcessedCoordinates(taskId) {
        try {
            // Получаем все сессии для задачи
            const sessionsQuery = `
                SELECT id FROM sessions
                WHERE task_id = $1
                ORDER BY start_time ASC
            `;

            const { rows } = await db.query(sessionsQuery, [taskId]);
            const sessionIds = rows.map(row => row.id);

            if (sessionIds.length === 0) {
                return [];
            }

            // Обрабатываем координаты для всех сессий
            const results = await this.processMultipleSessions(sessionIds);

            // Объединяем все обработанные позиции
            const allProcessedPositions = [];

            for (const result of results) {
                if (result.processedPositions && result.processedPositions.length > 0) {
                    allProcessedPositions.push(...result.processedPositions);
                }
            }

            // Сортируем по времени
            allProcessedPositions.sort((a, b) => a.timestamp - b.timestamp);

            // Преобразуем в формат для карты
            return allProcessedPositions.map(pos => ({
                latitude: pos.coords[0],
                longitude: pos.coords[1],
                timestamp: pos.timestamp,
                originalCount: pos.originalCount || 1
            }));
        } catch (error) {
            console.error(`❌ Error getting task processed coordinates:`, error);
            throw error;
        }
    }

    /**
     * Получает общую статистику по задаче
     * @param {number} taskId - ID задачи
     * @returns {Promise<Object>} - общая статистика задачи
     */
    async getTaskStats(taskId) {
        try {
            // Получаем все сессии для задачи
            const sessionsQuery = `
                SELECT id FROM sessions
                WHERE task_id = $1
                ORDER BY start_time ASC
            `;

            const { rows } = await db.query(sessionsQuery, [taskId]);
            const sessionIds = rows.map(row => row.id);

            if (sessionIds.length === 0) {
                return {
                    taskId,
                    sessionsCount: 0,
                    totalOriginalPositions: 0,
                    totalProcessedPositions: 0,
                    totalDistance: 0,
                    averageReductionPercent: 0,
                    movementTypes: []
                };
            }

            // Обрабатываем координаты для всех сессий
            const results = await this.processMultipleSessions(sessionIds);

            // Вычисляем общую статистику
            let totalOriginalPositions = 0;
            let totalProcessedPositions = 0;
            let totalDistance = 0;
            let validSessions = 0;
            const movementTypes = [];

            for (const result of results) {
                if (result.stats) {
                    totalOriginalPositions += result.stats.originalCount;
                    totalProcessedPositions += result.stats.processedCount;
                    totalDistance += result.stats.processedDistance;
                    validSessions++;

                    // Собираем типы движения
                    if (result.movementAnalysis && result.movementAnalysis.type) {
                        movementTypes.push({
                            type: result.movementAnalysis.type,
                            confidence: result.movementAnalysis.confidence,
                            avgSpeed: result.movementAnalysis.avgSpeed
                        });
                    }
                }
            }

            const averageReductionPercent = validSessions > 0
                ? results.reduce((sum, result) => sum + (parseFloat(result.stats?.reductionPercent) || 0), 0) / validSessions
                : 0;

            return {
                taskId,
                sessionsCount: sessionIds.length,
                totalOriginalPositions,
                totalProcessedPositions,
                totalDistance: Math.round(totalDistance),
                averageReductionPercent: averageReductionPercent.toFixed(1),
                movementTypes: movementTypes
            };
        } catch (error) {
            console.error(`❌ Error getting task stats:`, error);
            throw error;
        }
    }

    /**
     * Получает контекст для валидации координат
     * @param {number} sessionId - ID сессии
     * @returns {Promise<Object>} - контекст валидации
     */
    async getValidationContext(sessionId) {
        try {
            // Получаем информацию о задаче через сессию
            const query = `
                SELECT 
                    t.id as task_id,
                    t.expected_latitude,
                    t.expected_longitude,
                    t.max_deviation_km,
                    t.address,
                    t.title
                FROM sessions s
                LEFT JOIN tasks t ON s.task_id = t.id
                WHERE s.id = $1
            `;

            const { rows } = await db.query(query, [sessionId]);
            
            if (rows.length === 0 || !rows[0].task_id) {
                // Нет связанной задачи - возвращаем пустой контекст
                return {};
            }

            const task = rows[0];
            
            // Если нет ожидаемых координат, пытаемся получить их из адреса (в будущем можно добавить геокодирование)
            let expectedCoords = null;
            if (task.expected_latitude && task.expected_longitude) {
                expectedCoords = [task.expected_latitude, task.expected_longitude];
            }

            return {
                taskId: task.task_id,
                expectedCoords: expectedCoords,
                maxAllowedDeviationKm: task.max_deviation_km || 5.0,
                taskTitle: task.title,
                taskAddress: task.address
            };
        } catch (error) {
            console.error('❌ Error getting validation context:', error);
            return {}; // Возвращаем пустой контекст при ошибке
        }
    }

    /**
     * Обновляет настройки процессора
     * @param {Object} options - новые настройки
     */
    updateProcessorSettings(options) {
        this.processor = new CoordinateProcessor({
            enableAdaptiveMode: options.enableAdaptiveMode !== false,
            enableValidation: options.enableValidation !== false,
            maxSpeedKmh: options.maxSpeedKmh || this.processor.maxSpeedKmh,
            minSpeedKmh: options.minSpeedKmh || this.processor.minSpeedKmh,
            clusterRadiusMeters: options.clusterRadiusMeters || this.processor.clusterRadiusMeters,
            timeWindowMs: options.timeWindowMs || this.processor.timeWindowMs,
            minPointsForMedian: options.minPointsForMedian || this.processor.minPointsForMedian,
            maxAllowedDeviationKm: options.maxAllowedDeviationKm,
            consistentShiftThreshold: options.consistentShiftThreshold,
            suspiciousAccuracyThreshold: options.suspiciousAccuracyThreshold,
            teleportationMultiplier: options.teleportationMultiplier
        });

        console.log('⚙️ Updated coordinate processor settings:', options);
    }

    /**
     * Получает обработанные координаты сессий за период
     * @param {number} userId - ID пользователя
     * @param {Date} startDate - начальная дата
     * @param {Date} endDate - конечная дата
     * @returns {Promise<Array>} - массив обработанных координат
     */
    async getSessionsProcessedCoordinatesForPeriod(userId, startDate, endDate) {
        try {
            // Получаем все сессии пользователя за период
            const sessionsQuery = `
                SELECT id FROM sessions
                WHERE user_id = $1
                AND start_time >= $2
                AND start_time <= $3
                ORDER BY start_time ASC
            `;

            const { rows } = await db.query(sessionsQuery, [userId, startDate, endDate]);
            const sessionIds = rows.map(row => row.id);

            if (sessionIds.length === 0) {
                return [];
            }

            // Обрабатываем координаты для всех сессий
            const results = await this.processMultipleSessions(sessionIds);

            // Объединяем все обработанные позиции
            const allProcessedPositions = [];

            for (const result of results) {
                if (result.processedPositions && result.processedPositions.length > 0) {
                    allProcessedPositions.push(...result.processedPositions);
                }
            }

            // Сортируем по времени
            allProcessedPositions.sort((a, b) => a.timestamp - b.timestamp);

            // Преобразуем в формат для карты
            return allProcessedPositions.map(pos => ({
                latitude: pos.coords[0],
                longitude: pos.coords[1],
                timestamp: pos.timestamp,
                originalCount: pos.originalCount || 1
            }));
        } catch (error) {
            console.error(`❌ Error getting sessions processed coordinates for period:`, error);
            throw error;
        }
    }
}

module.exports = new CoordinateProcessingService(); 