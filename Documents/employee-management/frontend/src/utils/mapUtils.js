// Утилиты для работы с картой и маршрутами

/**
 * Рассчитывает границы всех маршрутов
 * @param {Array} routes - массив маршрутов
 * @returns {Object} объект с границами {minLat, maxLat, minLon, maxLon}
 */
export const calculateRouteBounds = (routes) => {
  if (!routes || routes.length === 0) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  routes.forEach(route => {
    if (route.positions && route.positions.length > 0) {
      route.positions.forEach(position => {
        const lat = position.latitude;
        const lon = position.longitude;
        
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      });
    }
  });

  // Проверяем, что границы валидны
  if (minLat === Infinity || maxLat === -Infinity || minLon === Infinity || maxLon === -Infinity) {
    return null;
  }

  return { minLat, maxLat, minLon, maxLon };
};

/**
 * Рассчитывает центр маршрутов
 * @param {Array} routes - массив маршрутов
 * @returns {Array} координаты центра [latitude, longitude]
 */
export const calculateRouteCenter = (routes) => {
  const bounds = calculateRouteBounds(routes);
  
  if (!bounds) {
    return [55.751244, 37.618423]; // Москва по умолчанию
  }

  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;

  return [centerLat, centerLon];
};

/**
 * Рассчитывает оптимальный зум для отображения маршрутов
 * @param {Array} routes - массив маршрутов
 * @param {number} defaultZoom - зум по умолчанию
 * @returns {number} оптимальный зум
 */
export const calculateOptimalZoom = (routes, defaultZoom = 9) => {
  const bounds = calculateRouteBounds(routes);
  
  if (!bounds) {
    return defaultZoom;
  }

  const latDiff = bounds.maxLat - bounds.minLat;
  const lonDiff = bounds.maxLon - bounds.minLon;
  const maxDiff = Math.max(latDiff, lonDiff);

  // Рассчитываем зум на основе размера области
  let zoom;
  if (maxDiff > 10) {
    zoom = 5; // Очень большая область
  } else if (maxDiff > 5) {
    zoom = 6;
  } else if (maxDiff > 2) {
    zoom = 7;
  } else if (maxDiff > 1) {
    zoom = 8;
  } else if (maxDiff > 0.5) {
    zoom = 9;
  } else if (maxDiff > 0.2) {
    zoom = 10;
  } else if (maxDiff > 0.1) {
    zoom = 11;
  } else if (maxDiff > 0.05) {
    zoom = 12;
  } else if (maxDiff > 0.02) {
    zoom = 13;
  } else if (maxDiff > 0.01) {
    zoom = 14;
  } else {
    zoom = 15; // Очень маленькая область
  }

  // Ограничиваем зум разумными пределами
  return Math.max(5, Math.min(15, zoom));
};

/**
 * Рассчитывает отступы для границ маршрутов
 * @param {Object} bounds - границы маршрутов
 * @param {number} paddingPercent - процент отступа (по умолчанию 10%)
 * @returns {Object} границы с отступами
 */
export const addBoundsPadding = (bounds, paddingPercent = 10) => {
  if (!bounds) {
    return null;
  }

  const latPadding = (bounds.maxLat - bounds.minLat) * (paddingPercent / 100);
  const lonPadding = (bounds.maxLon - bounds.minLon) * (paddingPercent / 100);

  return {
    minLat: bounds.minLat - latPadding,
    maxLat: bounds.maxLat + latPadding,
    minLon: bounds.minLon - lonPadding,
    maxLon: bounds.maxLon + lonPadding
  };
};

/**
 * Проверяет, находятся ли координаты в разумных пределах
 * @param {number} lat - широта
 * @param {number} lon - долгота
 * @returns {boolean} валидность координат
 */
export const isValidCoordinates = (lat, lon) => {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
};

/**
 * Рассчитывает расстояние между двумя точками в метрах
 * @param {number} lat1 - широта первой точки
 * @param {number} lon1 - долгота первой точки
 * @param {number} lat2 - широта второй точки
 * @param {number} lon2 - долгота второй точки
 * @returns {number} расстояние в метрах
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Радиус Земли в метрах
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  const deltaLat = (lat2 - lat1) * Math.PI / 180;
  const deltaLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}; 