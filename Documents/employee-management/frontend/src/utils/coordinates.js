/**
 * Утилиты для работы с координатами
 * Стандарт: [latitude, longitude] - массив из двух чисел
 */

/**
 * Преобразует координаты в стандартный формат [latitude, longitude]
 * @param {Object|Array|number} coords - координаты в любом формате
 * @returns {Array|null} - координаты в формате [latitude, longitude] или null
 */
export const normalizeCoordinates = (coords) => {
  if (!coords) return null;
  
  // Если это объект с latitude/longitude
  if (coords.latitude !== undefined && coords.longitude !== undefined) {
    return [parseFloat(coords.latitude), parseFloat(coords.longitude)];
  }
  
  // Если это массив [lat, lng]
  if (Array.isArray(coords) && coords.length === 2) {
    return [parseFloat(coords[0]), parseFloat(coords[1])];
  }
  
  return null;
};

/**
 * Проверяет валидность координат
 * @param {Array} coords - координаты в формате [latitude, longitude]
 * @returns {boolean} - true если координаты валидны
 */
export const isValidCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  
  const [lat, lng] = coords;
  
  // Проверяем что это числа
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  
  // Проверяем диапазоны
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  
  return true;
};

/**
 * Преобразует координаты из базы данных в стандартный формат
 * @param {Object} dbPosition - объект из БД с полями latitude, longitude
 * @returns {Array|null} - координаты в формате [latitude, longitude]
 */
export const fromDatabase = (dbPosition) => {
  if (!dbPosition || dbPosition.latitude === undefined || dbPosition.longitude === undefined) {
    return null;
  }
  return [parseFloat(dbPosition.latitude), parseFloat(dbPosition.longitude)];
};

/**
 * Преобразует координаты из Telegram API в стандартный формат
 * @param {Object} telegramLocation - объект из Telegram с полями latitude, longitude
 * @returns {Array|null} - координаты в формате [latitude, longitude]
 */
export const fromTelegram = (telegramLocation) => {
  if (!telegramLocation || telegramLocation.latitude === undefined || telegramLocation.longitude === undefined) {
    return null;
  }
  return [parseFloat(telegramLocation.latitude), parseFloat(telegramLocation.longitude)];
};

/**
 * Преобразует координаты для отправки в базу данных
 * @param {Array} coords - координаты в формате [latitude, longitude]
 * @returns {Object} - объект с полями latitude, longitude
 */
export const toDatabase = (coords) => {
  const normalized = normalizeCoordinates(coords);
  if (!normalized) return null;
  
  return {
    latitude: normalized[0],
    longitude: normalized[1]
  };
};

/**
 * Преобразует координаты для Яндекс.Карт
 * @param {Array} coords - координаты в формате [latitude, longitude]
 * @returns {Array} - координаты в формате [latitude, longitude] (без изменений)
 */
export const toYandexMaps = (coords) => {
  return normalizeCoordinates(coords);
};

/**
 * Вычисляет центр между несколькими точками
 * @param {Array} points - массив координат в формате [latitude, longitude]
 * @returns {Array|null} - центр в формате [latitude, longitude]
 */
export const calculateCenter = (points) => {
  if (!Array.isArray(points) || points.length === 0) return null;
  
  const validPoints = points.map(normalizeCoordinates).filter(Boolean);
  if (validPoints.length === 0) return null;
  
  const latSum = validPoints.reduce((sum, point) => sum + point[0], 0);
  const lngSum = validPoints.reduce((sum, point) => sum + point[1], 0);
  
  return [latSum / validPoints.length, lngSum / validPoints.length];
};

/**
 * Проверяет, находятся ли все точки в одном месте
 * @param {Array} points - массив координат в формате [latitude, longitude]
 * @param {number} tolerance - допустимая погрешность в метрах (по умолчанию 10)
 * @returns {boolean} - true если все точки в одном месте
 */
export const arePointsSame = (points, tolerance = 10) => {
  if (!Array.isArray(points) || points.length <= 1) return true;
  
  const validPoints = points.map(normalizeCoordinates).filter(Boolean);
  if (validPoints.length <= 1) return true;
  
  const firstPoint = validPoints[0];
  const toleranceDegrees = tolerance / 111000; // Примерно 111000 метров в градусе
  
  return validPoints.every(point => 
    Math.abs(point[0] - firstPoint[0]) < toleranceDegrees &&
    Math.abs(point[1] - firstPoint[1]) < toleranceDegrees
  );
};

/**
 * Дефолтные координаты (Москва)
 */
export const DEFAULT_COORDINATES = [55.751244, 37.618423]; 