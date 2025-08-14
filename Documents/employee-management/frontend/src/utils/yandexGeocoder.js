/**
 * Утилиты для работы с Яндекс Геосаджестом и геокодером
 */

const GEOSUGGEST_API_KEY = process.env.REACT_APP_GEOSUGGEST;
const YANDEX_MAP_API_KEY = process.env.REACT_APP_YANDEX_MAP_JS_API;

/**
 * Получает подсказки адресов через Яндекс Геосаджест
 * @param {string} query - поисковый запрос
 * @param {Object} options - дополнительные опции
 * @returns {Promise<Array>} - массив подсказок
 */
export const getAddressSuggestions = async (query, options = {}) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      apikey: GEOSUGGEST_API_KEY,
      text: query.trim(),
      lang: 'ru_RU',
      type: 'geo',
      results: options.limit || 10,
      ...options
    });

    const response = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results) {
      return [];
    }

    return data.results.map(item => ({
      id: item.id || `suggestion-${Math.random()}`,
      title: item.title?.text || item.title || '',
      subtitle: item.subtitle?.text || item.subtitle || '',
      value: item.value || item.title?.text || item.title || '',
      type: item.type || 'geo',
      coordinates: item.coordinates ? {
        latitude: parseFloat(item.coordinates.lat),
        longitude: parseFloat(item.coordinates.lon)
      } : null
    }));
  } catch (error) {
    console.error('Error fetching address suggestions:', error);
    return [];
  }
};

/**
 * Геокодирует адрес в координаты через Яндекс HTTP-геокодер
 * @param {string} address - адрес для геокодирования
 * @returns {Promise<Object|null>} - объект с координатами или null
 */
export const geocodeAddress = async (address) => {
  if (!address || !address.trim()) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      apikey: YANDEX_MAP_API_KEY,
      geocode: address.trim(),
      format: 'json',
      lang: 'ru_RU',
      results: 1
    });

    const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response || !data.response.GeoObjectCollection || !data.response.GeoObjectCollection.featureMember) {
      return null;
    }

    const feature = data.response.GeoObjectCollection.featureMember[0];
    if (!feature || !feature.GeoObject || !feature.GeoObject.Point) {
      return null;
    }

    const coordinates = feature.GeoObject.Point.pos.split(' ');
    const longitude = parseFloat(coordinates[0]);
    const latitude = parseFloat(coordinates[1]);

    return {
      latitude,
      longitude,
      address: feature.GeoObject.metaDataProperty?.GeocoderMetaData?.text || address,
      precision: feature.GeoObject.metaDataProperty?.GeocoderMetaData?.precision || 'unknown'
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
};

/**
 * Обратное геокодирование - получение адреса по координатам
 * @param {number} latitude - широта
 * @param {number} longitude - долгота
 * @returns {Promise<Object|null>} - объект с адресом или null
 */
export const reverseGeocode = async (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  try {
    const params = new URLSearchParams({
      apikey: YANDEX_MAP_API_KEY,
      geocode: `${longitude},${latitude}`,
      format: 'json',
      lang: 'ru_RU',
      results: 1
    });

    const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.response || !data.response.GeoObjectCollection || !data.response.GeoObjectCollection.featureMember) {
      return null;
    }

    const feature = data.response.GeoObjectCollection.featureMember[0];
    if (!feature || !feature.GeoObject) {
      return null;
    }

    return {
      address: feature.GeoObject.metaDataProperty?.GeocoderMetaData?.text || '',
      coordinates: {
        latitude,
        longitude
      },
      precision: feature.GeoObject.metaDataProperty?.GeocoderMetaData?.precision || 'unknown'
    };
  } catch (error) {
    console.error('Error reverse geocoding coordinates:', error);
    return null;
  }
};

/**
 * Форматирует координаты в строку для отображения
 * @param {number} latitude - широта
 * @param {number} longitude - долгота
 * @returns {string} - отформатированные координаты
 */
export const formatCoordinates = (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return '';
  }

  const latDeg = Math.abs(latitude);
  const latMin = (latDeg - Math.floor(latDeg)) * 60;
  const latSec = (latMin - Math.floor(latMin)) * 60;
  const latDir = latitude >= 0 ? 'N' : 'S';

  const lonDeg = Math.abs(longitude);
  const lonMin = (lonDeg - Math.floor(lonDeg)) * 60;
  const lonSec = (lonMin - Math.floor(lonMin)) * 60;
  const lonDir = longitude >= 0 ? 'E' : 'W';

  return `${Math.floor(latDeg)}°${Math.floor(latMin)}'${latSec.toFixed(2)}"${latDir} ${Math.floor(lonDeg)}°${Math.floor(lonMin)}'${lonSec.toFixed(2)}"${lonDir}`;
};

/**
 * Проверяет доступность API ключей
 * @returns {Object} - объект с статусом доступности ключей
 */
export const checkApiKeys = () => {
  const geosuggestKey = GEOSUGGEST_API_KEY;
  const geocoderKey = YANDEX_MAP_API_KEY;
  
  // Отладочная информация
  console.log('Environment variables check:');
  console.log('REACT_APP_GEOSUGGEST:', geosuggestKey ? 'SET' : 'NOT SET');
  console.log('REACT_APP_YANDEX_MAP_JS_API:', geocoderKey ? 'SET' : 'NOT SET');
  
  return {
    geosuggest: !!geosuggestKey,
    geocoder: !!geocoderKey
  };
}; 