/**
 * Модуль для детекции подмены координат
 * Реализует алгоритмы детекции:
 * 1. Анализ отклонения от ожидаемого местоположения (адреса задачи)
 * 2. Детекция постоянного сдвига координат (глушилки)
 * 3. Проверка паттернов неестественного движения
 * 4. Анализ подозрительной точности GPS
 */

const { isValidCoordinates } = require('./coordinates');

class CoordinateValidator {
    constructor(options = {}) {
        // Настройки валидации
        this.maxAllowedDeviationKm = options.maxAllowedDeviationKm || 5; // максимальное отклонение от ожидаемого места
        this.consistentShiftThreshold = options.consistentShiftThreshold || 0.001; // ~100м порог для постоянного сдвига
        this.suspiciousAccuracyThreshold = options.suspiciousAccuracyThreshold || 0.00001; // слишком точные координаты
        this.teleportationMultiplier = options.teleportationMultiplier || 3; // множитель для детекции телепортации
        
        // Константы
        this.EARTH_RADIUS_KM = 6371;
    }

    /**
     * Вычисляет расстояние между двумя точками в километрах
     * @param {Array} point1 - координаты [lat, lng]
     * @param {Array} point2 - координаты [lat, lng]
     * @returns {number} - расстояние в километрах
     */
    calculateDistance(point1, point2) {
        if (!isValidCoordinates(point1) || !isValidCoordinates(point2)) {
            return Infinity;
        }

        const [lat1, lng1] = point1;
        const [lat2, lng2] = point2;

        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.EARTH_RADIUS_KM * c;
    }

    /**
     * Преобразует градусы в радианы
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Основная функция валидации координат
     * @param {Array} coords - текущие координаты [lat, lng]
     * @param {Object} context - контекст валидации
     * @returns {Object} - результат валидации
     */
    validateCoordinates(coords, context = {}) {
        if (!isValidCoordinates(coords)) {
            return {
                isValid: false,
                riskLevel: 'HIGH',
                reason: 'invalid_coordinates',
                message: 'Некорректные координаты'
            };
        }

        const results = {
            isValid: true,
            riskLevel: 'LOW',
            warnings: [],
            details: {}
        };

        // 1. Проверка отклонения от ожидаемого места
        if (context.expectedCoords) {
            const deviationCheck = this.checkLocationDeviation(coords, context.expectedCoords);
            results.details.deviation = deviationCheck;
            
            if (deviationCheck.distance > this.maxAllowedDeviationKm) {
                results.warnings.push('location_deviation');
                results.riskLevel = this.upgradeRiskLevel(results.riskLevel, 'MEDIUM');
            }
        }

        // 2. Проверка на постоянный сдвиг (глушилки)
        if (context.previousPositions && context.previousPositions.length >= 3) {
            const shiftCheck = this.checkConsistentShift(coords, context.expectedCoords, context.previousPositions);
            results.details.consistentShift = shiftCheck;
            
            if (shiftCheck.isConsistent && shiftCheck.avgShiftKm > 0.5) {
                results.warnings.push('consistent_shift');
                results.riskLevel = this.upgradeRiskLevel(results.riskLevel, 'HIGH');
            }
        }

        // 3. Проверка на телепортацию
        if (context.lastPosition && context.timeDiff) {
            const teleportCheck = this.checkTeleportation(
                context.lastPosition.coords, 
                coords, 
                context.timeDiff,
                context.maxSpeedKmh || 120
            );
            results.details.teleportation = teleportCheck;
            
            if (teleportCheck.isTeleportation) {
                results.warnings.push('teleportation');
                results.riskLevel = this.upgradeRiskLevel(results.riskLevel, 'HIGH');
            }
        }

        // 4. Проверка подозрительной точности
        const accuracyCheck = this.checkSuspiciousAccuracy(coords);
        results.details.accuracy = accuracyCheck;
        
        if (accuracyCheck.isSuspicious) {
            results.warnings.push('suspicious_accuracy');
            results.riskLevel = this.upgradeRiskLevel(results.riskLevel, 'MEDIUM');
        }

        // 5. Проверка паттернов движения
        if (context.recentPositions && context.recentPositions.length >= 5) {
            const movementCheck = this.checkMovementPatterns(context.recentPositions);
            results.details.movement = movementCheck;
            
            if (movementCheck.suspiciousPatterns.length > 0) {
                results.warnings.push('suspicious_movement');
                results.riskLevel = this.upgradeRiskLevel(results.riskLevel, 'MEDIUM');
            }
        }

        // Определяем финальный статус
        if (results.riskLevel === 'HIGH') {
            results.isValid = false;
            results.requiresVerification = true;
        } else if (results.riskLevel === 'MEDIUM') {
            results.requiresAttention = true;
        }

        return results;
    }

    /**
     * Проверяет отклонение от ожидаемого местоположения
     * @param {Array} coords - текущие координаты
     * @param {Array} expectedCoords - ожидаемые координаты
     * @returns {Object} - результат проверки
     */
    checkLocationDeviation(coords, expectedCoords) {
        const distance = this.calculateDistance(coords, expectedCoords);
        
        return {
            distance: distance,
            isNearExpected: distance <= this.maxAllowedDeviationKm,
            expectedCoords: expectedCoords,
            actualCoords: coords
        };
    }

    /**
     * Детекция постоянного сдвига координат (глушилки)
     * @param {Array} currentCoords - текущие координаты
     * @param {Array} expectedCoords - ожидаемые координаты
     * @param {Array} previousPositions - предыдущие позиции
     * @returns {Object} - результат анализа
     */
    checkConsistentShift(currentCoords, expectedCoords, previousPositions) {
        if (!expectedCoords || previousPositions.length < 3) {
            return { isConsistent: false, reason: 'insufficient_data' };
        }

        // Добавляем текущую позицию к анализу
        const allPositions = [...previousPositions, { coords: currentCoords }];
        
        // Вычисляем сдвиги относительно ожидаемой точки
        const shifts = allPositions.map(pos => ({
            latShift: pos.coords[0] - expectedCoords[0],
            lngShift: pos.coords[1] - expectedCoords[1],
            distance: this.calculateDistance(pos.coords, expectedCoords)
        }));

        // Анализируем консистентность сдвигов
        const avgLatShift = shifts.reduce((sum, s) => sum + s.latShift, 0) / shifts.length;
        const avgLngShift = shifts.reduce((sum, s) => sum + s.lngShift, 0) / shifts.length;
        const avgShiftKm = shifts.reduce((sum, s) => sum + s.distance, 0) / shifts.length;

        // Проверяем, насколько стабильны сдвиги
        const latVariance = shifts.reduce((sum, s) => sum + Math.pow(s.latShift - avgLatShift, 2), 0) / shifts.length;
        const lngVariance = shifts.reduce((sum, s) => sum + Math.pow(s.lngShift - avgLngShift, 2), 0) / shifts.length;

        const isConsistent = latVariance < this.consistentShiftThreshold && 
                           lngVariance < this.consistentShiftThreshold &&
                           Math.abs(avgLatShift) > this.consistentShiftThreshold;

        return {
            isConsistent,
            avgLatShift,
            avgLngShift,
            avgShiftKm,
            latVariance,
            lngVariance,
            confidence: isConsistent ? 1 - Math.max(latVariance, lngVariance) / this.consistentShiftThreshold : 0
        };
    }

    /**
     * Детекция телепортации (мгновенные перемещения)
     * @param {Array} fromCoords - начальные координаты
     * @param {Array} toCoords - конечные координаты
     * @param {number} timeDiffMs - разница во времени в миллисекундах
     * @param {number} maxSpeedKmh - максимальная допустимая скорость
     * @returns {Object} - результат проверки
     */
    checkTeleportation(fromCoords, toCoords, timeDiffMs, maxSpeedKmh = 120) {
        const distance = this.calculateDistance(fromCoords, toCoords);
        const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
        
        if (timeDiffHours === 0) {
            return { isTeleportation: false, reason: 'zero_time_diff' };
        }

        const actualSpeed = distance / timeDiffHours;
        const maxAllowedSpeed = maxSpeedKmh * this.teleportationMultiplier;
        
        const isTeleportation = actualSpeed > maxAllowedSpeed;

        return {
            isTeleportation,
            distance,
            actualSpeed,
            maxAllowedSpeed,
            timeDiffHours,
            speedRatio: actualSpeed / maxSpeedKmh
        };
    }

    /**
     * Проверка на подозрительно точные координаты
     * @param {Array} coords - координаты
     * @returns {Object} - результат проверки
     */
    checkSuspiciousAccuracy(coords) {
        const [lat, lng] = coords;
        
        // Проверяем количество десятичных знаков
        const latDecimals = (lat.toString().split('.')[1] || '').length;
        const lngDecimals = (lng.toString().split('.')[1] || '').length;
        
        // Проверяем на "идеальные" числа (много нулей подряд)
        const latStr = lat.toString();
        const lngStr = lng.toString();
        const hasRepeatingZeros = /0{4,}/.test(latStr) || /0{4,}/.test(lngStr);
        const hasRepeatingDigits = /(\d)\1{4,}/.test(latStr) || /(\d)\1{4,}/.test(lngStr);
        
        // Проверяем на слишком "круглые" числа
        const latFractional = Math.abs(lat - Math.round(lat));
        const lngFractional = Math.abs(lng - Math.round(lng));
        const isTooRound = latFractional < this.suspiciousAccuracyThreshold || 
                          lngFractional < this.suspiciousAccuracyThreshold;

        const isSuspicious = hasRepeatingZeros || hasRepeatingDigits || isTooRound || 
                           latDecimals > 8 || lngDecimals > 8;

        return {
            isSuspicious,
            latDecimals,
            lngDecimals,
            hasRepeatingZeros,
            hasRepeatingDigits,
            isTooRound,
            details: {
                lat: latStr,
                lng: lngStr,
                latFractional,
                lngFractional
            }
        };
    }

    /**
     * Анализ подозрительных паттернов движения
     * @param {Array} positions - массив позиций с временными метками
     * @returns {Object} - результат анализа
     */
    checkMovementPatterns(positions) {
        if (positions.length < 5) {
            return { suspiciousPatterns: [], reason: 'insufficient_data' };
        }

        const suspiciousPatterns = [];
        
        // 1. Проверка на движение по идеально прямой линии
        if (this.checkStraightLineMovement(positions)) {
            suspiciousPatterns.push('straight_line_movement');
        }

        // 2. Проверка на резкие скачки скорости
        if (this.checkSpeedJumps(positions)) {
            suspiciousPatterns.push('speed_jumps');
        }

        // 3. Проверка на неестественное замедление/ускорение
        if (this.checkUnnaturalAcceleration(positions)) {
            suspiciousPatterns.push('unnatural_acceleration');
        }

        return {
            suspiciousPatterns,
            totalPatterns: suspiciousPatterns.length,
            confidence: suspiciousPatterns.length / 3 // нормализуем к [0,1]
        };
    }

    /**
     * Проверка движения по прямой линии (подозрительно для городской среды)
     */
    checkStraightLineMovement(positions) {
        if (positions.length < 4) return false;

        const deviations = [];
        for (let i = 1; i < positions.length - 1; i++) {
            const prev = positions[i - 1].coords;
            const curr = positions[i].coords;
            const next = positions[i + 1].coords;
            
            // Вычисляем отклонение от прямой линии между prev и next
            const deviation = this.pointToLineDistance(curr, prev, next);
            deviations.push(deviation);
        }

        // Если все отклонения очень малы - подозрительно
        const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
        return avgDeviation < 0.01; // меньше 10 метров
    }

    /**
     * Расстояние от точки до прямой линии между двумя точками
     */
    pointToLineDistance(point, lineStart, lineEnd) {
        const [x0, y0] = point;
        const [x1, y1] = lineStart;
        const [x2, y2] = lineEnd;

        const A = y2 - y1;
        const B = x1 - x2;
        const C = x2 * y1 - x1 * y2;

        return Math.abs(A * x0 + B * y0 + C) / Math.sqrt(A * A + B * B);
    }

    /**
     * Проверка на резкие скачки скорости
     */
    checkSpeedJumps(positions) {
        const speeds = [];
        for (let i = 1; i < positions.length; i++) {
            const distance = this.calculateDistance(positions[i - 1].coords, positions[i].coords);
            const timeDiff = Math.abs(positions[i].timestamp - positions[i - 1].timestamp) / (1000 * 60 * 60);
            if (timeDiff > 0) {
                speeds.push(distance / timeDiff);
            }
        }

        if (speeds.length < 3) return false;

        // Ищем резкие изменения скорости
        let jumpCount = 0;
        for (let i = 1; i < speeds.length; i++) {
            const speedChange = Math.abs(speeds[i] - speeds[i - 1]);
            if (speedChange > 20) { // изменение больше 20 км/ч
                jumpCount++;
            }
        }

        return jumpCount > speeds.length * 0.3; // более 30% изменений - подозрительно
    }

    /**
     * Проверка неестественного ускорения
     */
    checkUnnaturalAcceleration(positions) {
        // Эта проверка может быть расширена для детекции искусственных паттернов
        // Пока оставляем базовую реализацию
        return false;
    }

    /**
     * Повышает уровень риска
     */
    upgradeRiskLevel(currentLevel, newLevel) {
        const levels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };
        const levelNames = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };
        
        const currentValue = levels[currentLevel] || 1;
        const newValue = levels[newLevel] || 1;
        
        return levelNames[Math.max(currentValue, newValue)];
    }

    /**
     * Получает рекомендуемые действия на основе результата валидации
     * @param {Object} validationResult - результат валидации
     * @returns {Object} - рекомендуемые действия
     */
    getRecommendedActions(validationResult) {
        const actions = {
            accept: false,
            requireVerification: false,
            flagForReview: false,
            logForAnalysis: true,
            message: ''
        };

        switch (validationResult.riskLevel) {
            case 'LOW':
                actions.accept = true;
                actions.message = 'Координаты приняты';
                break;
                
            case 'MEDIUM':
                actions.accept = true;
                actions.flagForReview = true;
                actions.message = 'Координаты приняты с предупреждениями. Возможны помехи GPS.';
                break;
                
            case 'HIGH':
                actions.requireVerification = true;
                actions.message = 'Обнаружены подозрительные координаты. Требуется дополнительная верификация.';
                break;
        }

        // Специфичные действия для разных типов проблем
        if (validationResult.warnings.includes('consistent_shift')) {
            actions.message += ' Возможно влияние глушилок GPS в данной зоне.';
        }
        
        if (validationResult.warnings.includes('teleportation')) {
            actions.message += ' Обнаружено мгновенное перемещение на большое расстояние.';
        }

        return actions;
    }
}

module.exports = CoordinateValidator; 