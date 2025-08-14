/**
 * Модуль для обработки и фильтрации координат
 * Реализует алгоритмы:
 * 1. Фильтрация по скорости (отбрасывание нереалистичных перемещений)
 * 3. Кластеризация близких точек
 * 6. Медианное усреднение координат
 * + Адаптивный алгоритм определения типа движения
 * + Детекция подмены координат
 */

const { isValidCoordinates } = require('./coordinates');
const CoordinateValidator = require('./coordinateValidator');

class CoordinateProcessor {
    constructor(options = {}) {
        // Настройки фильтрации по скорости
        this.maxSpeedKmh = options.maxSpeedKmh || 100; // максимальная скорость в км/ч
        this.minSpeedKmh = options.minSpeedKmh || 0.1; // минимальная скорость для фильтрации (исключаем статичные точки)

        // Настройки кластеризации
        this.clusterRadiusMeters = options.clusterRadiusMeters || 20; // радиус кластера в метрах
        this.timeWindowMs = options.timeWindowMs || 30000; // временное окно для группировки (30 секунд)

        // Настройки медианного усреднения
        this.minPointsForMedian = options.minPointsForMedian || 3; // минимальное количество точек для медианы

        // Адаптивные настройки
        this.enableAdaptiveMode = options.enableAdaptiveMode !== false; // включить адаптивный режим
        this.adaptiveSpeedThresholds = {
            walking: { min: 0.5, max: 8 },      // пешком: 0.5-8 км/ч
            scooter: { min: 3, max: 25 },       // самокат: 3-25 км/ч
            car: { min: 5, max: 120 },          // авто: 5-120 км/ч
            train: { min: 20, max: 200 }        // поезд: 20-200 км/ч
        };

        // Настройки валидации координат
        this.enableValidation = options.enableValidation !== false; // включить валидацию координат
        this.validator = new CoordinateValidator({
            maxAllowedDeviationKm: options.maxAllowedDeviationKm || 5,
            consistentShiftThreshold: options.consistentShiftThreshold || 0.001,
            suspiciousAccuracyThreshold: options.suspiciousAccuracyThreshold || 0.00001,
            teleportationMultiplier: options.teleportationMultiplier || 3
        });

        // Константы
        this.EARTH_RADIUS_KM = 6371; // радиус Земли в км
        this.METERS_PER_DEGREE_LAT = 111000; // примерно метров в градусе широты
    }

    /**
     * Определяет тип движения на основе анализа скоростей
     * @param {Array} positions - массив позиций
     * @returns {Object} - тип движения и рекомендуемые настройки
     */
    analyzeMovementType(positions) {
        if (positions.length < 5) {
            return {
                type: 'unknown',
                confidence: 0,
                settings: this.getDefaultSettings()
            };
        }

        // Вычисляем скорости между последовательными точками
        const speeds = [];
        for (let i = 1; i < positions.length; i++) {
            const speed = this.calculateSpeed(
                positions[i - 1].coords,
                positions[i].coords,
                positions[i - 1].timestamp,
                positions[i].timestamp
            );
            if (speed > 0 && speed < 500) { // отфильтровываем выбросы
                speeds.push(speed);
            }
        }

        if (speeds.length === 0) {
            return {
                type: 'static',
                confidence: 1,
                settings: this.getStaticSettings()
            };
        }

        // Анализируем статистику скоростей
        const avgSpeed = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
        const maxSpeed = Math.max(...speeds);
        const speedVariance = speeds.reduce((sum, s) => sum + Math.pow(s - avgSpeed, 2), 0) / speeds.length;

        // Определяем тип движения
        let detectedType = 'unknown';
        let confidence = 0;

        for (const [type, thresholds] of Object.entries(this.adaptiveSpeedThresholds)) {
            const inRange = speeds.filter(s => s >= thresholds.min && s <= thresholds.max).length;
            const typeConfidence = inRange / speeds.length;

            if (typeConfidence > confidence) {
                confidence = typeConfidence;
                detectedType = type;
            }
        }

        // Дополнительная логика для определения типа
        if (avgSpeed < 1 && maxSpeed < 3) {
            detectedType = 'walking';
            confidence = Math.max(confidence, 0.8);
        } else if (avgSpeed > 15 && maxSpeed > 30) {
            detectedType = 'car';
            confidence = Math.max(confidence, 0.7);
        } else if (avgSpeed > 8 && avgSpeed < 20 && speedVariance < 50) {
            detectedType = 'scooter';
            confidence = Math.max(confidence, 0.6);
        }

        console.log(`🔍 Анализ движения: ${detectedType} (уверенность: ${(confidence * 100).toFixed(1)}%)`);
        console.log(`📊 Средняя скорость: ${avgSpeed.toFixed(1)} км/ч, Максимальная: ${maxSpeed.toFixed(1)} км/ч`);

        return {
            type: detectedType,
            confidence: confidence,
            avgSpeed: avgSpeed,
            maxSpeed: maxSpeed,
            settings: this.getAdaptiveSettings(detectedType, avgSpeed, maxSpeed)
        };
    }

    /**
     * Получает адаптивные настройки для типа движения
     * @param {string} movementType - тип движения
     * @param {number} avgSpeed - средняя скорость
     * @param {number} maxSpeed - максимальная скорость
     * @returns {Object} - настройки
     */
    getAdaptiveSettings(movementType, avgSpeed, maxSpeed) {
        const baseSettings = {
            maxSpeedKmh: Math.min(maxSpeed * 1.5, 200),
            minSpeedKmh: Math.max(avgSpeed * 0.1, 0.05),
            clusterRadiusMeters: 20,
            timeWindowMs: 30000,
            minPointsForMedian: 3
        };

        switch (movementType) {
            case 'walking':
                return {
                    ...baseSettings,
                    maxSpeedKmh: 10,
                    minSpeedKmh: 0.3,
                    clusterRadiusMeters: 10,
                    timeWindowMs: 20000,
                    minPointsForMedian: 2
                };

            case 'scooter':
                return {
                    ...baseSettings,
                    maxSpeedKmh: 30,
                    minSpeedKmh: 1,
                    clusterRadiusMeters: 15,
                    timeWindowMs: 25000,
                    minPointsForMedian: 3
                };

            case 'car':
                return {
                    ...baseSettings,
                    maxSpeedKmh: 130,
                    minSpeedKmh: 3,
                    clusterRadiusMeters: 30,
                    timeWindowMs: 45000,
                    minPointsForMedian: 4
                };

            case 'train':
                return {
                    ...baseSettings,
                    maxSpeedKmh: 200,
                    minSpeedKmh: 10,
                    clusterRadiusMeters: 50,
                    timeWindowMs: 60000,
                    minPointsForMedian: 5
                };

            default:
                return baseSettings;
        }
    }

    /**
     * Получает настройки для статичного объекта
     */
    getStaticSettings() {
        return {
            maxSpeedKmh: 5,
            minSpeedKmh: 0.1,
            clusterRadiusMeters: 5,
            timeWindowMs: 10000,
            minPointsForMedian: 2
        };
    }

    /**
     * Получает настройки по умолчанию
     */
    getDefaultSettings() {
        return {
            maxSpeedKmh: 100,
            minSpeedKmh: 0.1,
            clusterRadiusMeters: 20,
            timeWindowMs: 30000,
            minPointsForMedian: 3
        };
    }

    /**
     * Вычисляет расстояние между двумя точками в метрах
     * @param {Array} point1 - координаты [lat, lng]
     * @param {Array} point2 - координаты [lat, lng]
     * @returns {number} - расстояние в метрах
     */
    calculateDistance(point1, point2) {
        if (!isValidCoordinates(point1) || !isValidCoordinates(point2)) {
            return Infinity;
        }

        const [lat1, lng1] = point1;
        const [lat2, lng2] = point2;

        // Формула гаверсинуса для точного расчета расстояния
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.EARTH_RADIUS_KM * c * 1000; // в метрах
    }

    /**
     * Преобразует градусы в радианы
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Вычисляет скорость между двумя точками в км/ч
     * @param {Array} point1 - координаты [lat, lng]
     * @param {Array} point2 - координаты [lat, lng]
     * @param {Date} time1 - время первой точки
     * @param {Date} time2 - время второй точки
     * @returns {number} - скорость в км/ч
     */
    calculateSpeed(point1, point2, time1, time2) {
        const distance = this.calculateDistance(point1, point2);
        const timeDiffHours = Math.abs(time2 - time1) / (1000 * 60 * 60); // в часах

        if (timeDiffHours === 0) return 0;
        return distance / 1000 / timeDiffHours; // км/ч
    }

    /**
     * Валидирует одну позицию на предмет подмены координат
     * @param {Object} position - позиция {coords: [lat, lng], timestamp: Date}
     * @param {Object} context - контекст для валидации
     * @returns {Object} - результат валидации
     */
    validatePosition(position, context = {}) {
        if (!this.enableValidation) {
            return { isValid: true, riskLevel: 'LOW', warnings: [] };
        }

        return this.validator.validateCoordinates(position.coords, {
            expectedCoords: context.expectedCoords,
            previousPositions: context.previousPositions,
            lastPosition: context.lastPosition,
            timeDiff: context.lastPosition ? 
                Math.abs(position.timestamp - context.lastPosition.timestamp) : null,
            maxSpeedKmh: this.maxSpeedKmh,
            recentPositions: context.recentPositions
        });
    }

    /**
     * Фильтрует точки по результатам валидации
     * @param {Array} positions - массив позиций
     * @param {Object} validationContext - контекст валидации
     * @returns {Object} - результат фильтрации с деталями валидации
     */
    filterByValidation(positions, validationContext = {}) {
        if (!this.enableValidation || positions.length === 0) {
            return {
                filtered: positions,
                validationResults: [],
                stats: { total: positions.length, accepted: positions.length, flagged: 0, rejected: 0 }
            };
        }

        const filtered = [];
        const validationResults = [];
        const stats = { total: positions.length, accepted: 0, flagged: 0, rejected: 0 };

        for (let i = 0; i < positions.length; i++) {
            const position = positions[i];
            
            // Подготавливаем контекст для валидации
            const context = {
                expectedCoords: validationContext.expectedCoords,
                previousPositions: filtered.slice(-5), // последние 5 валидных позиций
                lastPosition: filtered.length > 0 ? filtered[filtered.length - 1] : null,
                recentPositions: positions.slice(Math.max(0, i - 10), i) // последние 10 позиций для анализа паттернов
            };

            const validation = this.validatePosition(position, context);
            validationResults.push({
                position: position,
                validation: validation,
                index: i
            });

            // Принимаем решение на основе результата валидации
            const actions = this.validator.getRecommendedActions(validation);

            if (actions.accept) {
                filtered.push({
                    ...position,
                    validationInfo: {
                        riskLevel: validation.riskLevel,
                        warnings: validation.warnings,
                        flagged: actions.flagForReview
                    }
                });
                
                if (actions.flagForReview) {
                    stats.flagged++;
                } else {
                    stats.accepted++;
                }
            } else {
                stats.rejected++;
                console.log(`🚫 Position ${i} rejected by validation: ${actions.message}`);
            }
        }

        console.log(`🔍 Validation filtering: ${stats.total} -> ${filtered.length} positions (${stats.rejected} rejected, ${stats.flagged} flagged)`);

        return {
            filtered,
            validationResults,
            stats
        };
    }

    /**
     * Фильтрует точки по скорости (алгоритм 1)
     * @param {Array} positions - массив позиций [{coords: [lat, lng], timestamp: Date}, ...]
     * @returns {Array} - отфильтрованные позиции
     */
    filterBySpeed(positions) {
        if (positions.length <= 1) return positions;

        const filtered = [positions[0]]; // всегда включаем первую точку

        for (let i = 1; i < positions.length; i++) {
            const current = positions[i];
            const previous = positions[i - 1];

            // Проверяем валидность координат
            if (!isValidCoordinates(current.coords) || !isValidCoordinates(previous.coords)) {
                console.log(`⚠️ Invalid coordinates at position ${i}, skipping`);
                continue;
            }

            const speed = this.calculateSpeed(
                previous.coords,
                current.coords,
                previous.timestamp,
                current.timestamp
            );

            // Фильтруем по скорости
            if (speed <= this.maxSpeedKmh && speed >= this.minSpeedKmh) {
                filtered.push(current);
            } else {
                console.log(`🚫 Filtered out position ${i} with speed ${speed.toFixed(2)} km/h`);
            }
        }

        console.log(`📊 Speed filtering: ${positions.length} -> ${filtered.length} positions`);
        return filtered;
    }

    /**
     * Группирует точки по времени (алгоритм 6, шаг 1)
     * @param {Array} positions - массив позиций
     * @returns {Array} - группы позиций по времени
     */
    groupByTime(positions) {
        if (positions.length === 0) return [];

        const groups = [];
        let currentGroup = [positions[0]];

        for (let i = 1; i < positions.length; i++) {
            const current = positions[i];
            const firstInGroup = currentGroup[0];

            const timeDiff = Math.abs(current.timestamp - firstInGroup.timestamp);

            if (timeDiff <= this.timeWindowMs) {
                // Добавляем в текущую группу
                currentGroup.push(current);
            } else {
                // Завершаем текущую группу и начинаем новую
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = [current];
            }
        }

        // Добавляем последнюю группу
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        console.log(`⏰ Time grouping: ${positions.length} positions -> ${groups.length} groups`);
        return groups;
    }

    /**
     * Кластеризует точки в группе по расстоянию (алгоритм 3)
     * @param {Array} positions - массив позиций в одной временной группе
     * @returns {Array} - кластеры позиций
     */
    clusterPositions(positions) {
        if (positions.length <= 1) return [positions];

        const clusters = [];
        const visited = new Set();

        for (let i = 0; i < positions.length; i++) {
            if (visited.has(i)) continue;

            const cluster = [positions[i]];
            visited.add(i);

            // Ищем близкие точки
            for (let j = i + 1; j < positions.length; j++) {
                if (visited.has(j)) continue;

                const distance = this.calculateDistance(
                    positions[i].coords,
                    positions[j].coords
                );

                if (distance <= this.clusterRadiusMeters) {
                    cluster.push(positions[j]);
                    visited.add(j);
                }
            }

            clusters.push(cluster);
        }

        console.log(`🎯 Clustering: ${positions.length} positions -> ${clusters.length} clusters`);
        return clusters;
    }

    /**
     * Вычисляет медиану координат в кластере (алгоритм 6, шаг 2)
     * @param {Array} cluster - кластер позиций
     * @returns {Object|null} - медианная позиция или null
     */
    calculateMedianPosition(cluster) {
        if (cluster.length === 0) return null;
        if (cluster.length === 1) return cluster[0];

        // Если точек недостаточно для медианы, используем среднее
        if (cluster.length < this.minPointsForMedian) {
            return this.calculateAveragePosition(cluster);
        }

        // Вычисляем медиану для широты и долготы отдельно
        const lats = cluster.map(p => p.coords[0]).sort((a, b) => a - b);
        const lngs = cluster.map(p => p.coords[1]).sort((a, b) => a - b);

        const medianLat = this.calculateMedian(lats);
        const medianLng = this.calculateMedian(lngs);

        // Используем среднее время кластера
        const avgTimestamp = new Date(
            cluster.reduce((sum, p) => sum + p.timestamp.getTime(), 0) / cluster.length
        );

        return {
            coords: [medianLat, medianLng],
            timestamp: avgTimestamp,
            originalCount: cluster.length
        };
    }

    /**
     * Вычисляет среднее значение координат
     * @param {Array} cluster - кластер позиций
     * @returns {Object} - средняя позиция
     */
    calculateAveragePosition(cluster) {
        const avgLat = cluster.reduce((sum, p) => sum + p.coords[0], 0) / cluster.length;
        const avgLng = cluster.reduce((sum, p) => sum + p.coords[1], 0) / cluster.length;
        const avgTimestamp = new Date(
            cluster.reduce((sum, p) => sum + p.timestamp.getTime(), 0) / cluster.length
        );

        return {
            coords: [avgLat, avgLng],
            timestamp: avgTimestamp,
            originalCount: cluster.length
        };
    }

    /**
     * Вычисляет медиану массива чисел
     * @param {Array} numbers - массив чисел
     * @returns {number} - медиана
     */
    calculateMedian(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        } else {
            return sorted[mid];
        }
    }

    /**
     * Основной метод обработки координат (комбинация алгоритмов 1, 3, 6 + адаптивный режим + валидация)
     * @param {Array} positions - массив позиций [{coords: [lat, lng], timestamp: Date}, ...]
     * @param {Object} validationContext - контекст для валидации (expectedCoords, taskId, etc.)
     * @returns {Object} - результат обработки с информацией о типе движения и валидации
     */
    processCoordinates(positions, validationContext = {}) {
        if (!Array.isArray(positions) || positions.length === 0) {
            return {
                processedPositions: [],
                movementAnalysis: null,
                validationSummary: null,
                stats: null
            };
        }

        console.log(`🔄 Starting coordinate processing for ${positions.length} positions`);

        // Шаг 0: Валидация координат (новый этап)
        let validationResult = null;
        let validatedPositions = positions;

        if (this.enableValidation) {
            validationResult = this.filterByValidation(positions, validationContext);
            validatedPositions = validationResult.filtered;
            
            console.log(`🔍 Validation completed: ${validationResult.stats.rejected} rejected, ${validationResult.stats.flagged} flagged`);
        }

        let movementAnalysis = null;
        let adaptiveSettings = null;

        // Адаптивный анализ типа движения (используем валидированные позиции)
        if (this.enableAdaptiveMode) {
            movementAnalysis = this.analyzeMovementType(validatedPositions);
            adaptiveSettings = movementAnalysis.settings;

            // Применяем адаптивные настройки
            this.maxSpeedKmh = adaptiveSettings.maxSpeedKmh;
            this.minSpeedKmh = adaptiveSettings.minSpeedKmh;
            this.clusterRadiusMeters = adaptiveSettings.clusterRadiusMeters;
            this.timeWindowMs = adaptiveSettings.timeWindowMs;
            this.minPointsForMedian = adaptiveSettings.minPointsForMedian;

            console.log(`🎯 Applied adaptive settings for ${movementAnalysis.type}:`, adaptiveSettings);
        }

        // Шаг 1: Фильтрация по скорости
        const speedFiltered = this.filterBySpeed(validatedPositions);

        // Шаг 2: Группировка по времени
        const timeGroups = this.groupByTime(speedFiltered);

        // Шаг 3: Кластеризация и медианное усреднение
        const processed = [];

        for (const group of timeGroups) {
            const clusters = this.clusterPositions(group);

            for (const cluster of clusters) {
                const medianPosition = this.calculateMedianPosition(cluster);
                if (medianPosition) {
                    processed.push(medianPosition);
                }
            }
        }

        console.log(`✅ Coordinate processing completed: ${positions.length} -> ${processed.length} positions`);

        // Вычисляем статистику
        const stats = this.getProcessingStats(positions, processed);

        // Добавляем статистику валидации
        if (validationResult) {
            stats.validation = validationResult.stats;
        }

        return {
            processedPositions: processed,
            movementAnalysis: movementAnalysis,
            validationSummary: validationResult ? {
                stats: validationResult.stats,
                highRiskPositions: validationResult.validationResults.filter(r => r.validation.riskLevel === 'HIGH'),
                flaggedPositions: validationResult.validationResults.filter(r => r.validation.warnings.length > 0)
            } : null,
            stats: stats
        };
    }

    /**
     * Вычисляет общее расстояние маршрута по обработанным точкам
     * @param {Array} processedPositions - обработанные позиции
     * @returns {number} - общее расстояние в метрах
     */
    calculateTotalDistance(processedPositions) {
        if (processedPositions.length <= 1) return 0;

        let totalDistance = 0;

        for (let i = 1; i < processedPositions.length; i++) {
            const distance = this.calculateDistance(
                processedPositions[i - 1].coords,
                processedPositions[i].coords
            );
            totalDistance += distance;
        }

        return totalDistance;
    }

    /**
     * Получает статистику обработки
     * @param {Array} originalPositions - исходные позиции
     * @param {Array} processedPositions - обработанные позиции
     * @returns {Object} - статистика
     */
    getProcessingStats(originalPositions, processedPositions) {
        const originalDistance = this.calculateTotalDistance(originalPositions);
        const processedDistance = this.calculateTotalDistance(processedPositions);

        return {
            originalCount: originalPositions.length,
            processedCount: processedPositions.length,
            reductionPercent: originalPositions.length > 0
                ? ((originalPositions.length - processedPositions.length) / originalPositions.length * 100).toFixed(1)
                : 0,
            originalDistance: Math.round(originalDistance),
            processedDistance: Math.round(processedDistance),
            distanceChangePercent: originalDistance > 0
                ? ((processedDistance - originalDistance) / originalDistance * 100).toFixed(1)
                : 0
        };
    }
}

module.exports = CoordinateProcessor; 