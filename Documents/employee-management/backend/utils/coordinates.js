/**
 * Утилиты для работы с координатами на backend
 * Стандарт: [latitude, longitude] - массив из двух чисел
 */

/**
 * Преобразует координаты из базы данных в стандартный формат
 * @param {Object} dbPosition - объект из БД с полями latitude, longitude
 * @returns {Array|null} - координаты в формате [latitude, longitude]
 */
const fromDatabase = (dbPosition) => {
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
const fromTelegram = (telegramLocation) => {
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
const toDatabase = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return null;
  
  return {
    latitude: parseFloat(coords[0]),
    longitude: parseFloat(coords[1])
  };
};

/**
 * Проверяет валидность координат
 * @param {Array} coords - координаты в формате [latitude, longitude]
 * @returns {boolean} - true если координаты валидны
 */
const isValidCoordinates = (coords) => {
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
 * Вычисляет центр между несколькими точками
 * @param {Array} points - массив координат в формате [latitude, longitude]
 * @returns {Array|null} - центр в формате [latitude, longitude]
 */
const calculateCenter = (points) => {
  if (!Array.isArray(points) || points.length === 0) return null;
  
  const validPoints = points.filter(point => isValidCoordinates(point));
  if (validPoints.length === 0) return null;
  
  const latSum = validPoints.reduce((sum, point) => sum + point[0], 0);
  const lngSum = validPoints.reduce((sum, point) => sum + point[1], 0);
  
  return [latSum / validPoints.length, lngSum / validPoints.length];
};

module.exports = {
  fromDatabase,
  fromTelegram,
  toDatabase,
  isValidCoordinates,
  calculateCenter
}; 