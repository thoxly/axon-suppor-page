import { Box } from '@mui/material';
import { YMaps, Map as YandexMapComponent, Polyline, Placemark } from '@pbe/react-yandex-maps';
import { normalizeCoordinates, arePointsSame } from '../../utils/coordinates';
import { calculateRouteCenter, calculateOptimalZoom } from '../../utils/mapUtils';
import React from 'react'; // Added missing import for React

const YANDEX_MAPS_API_KEY = process.env.REACT_APP_YANDEX_MAPS_API_KEY || 'e7b69b16-3c2b-4dfa-a2eb-563f03c35734';

const YandexMap = ({ 
  points = [], 
  center = [55.751244, 37.618423], 
  route = [], 
  routes = [], // Новый проп для множественных маршрутов
  employees = [], 
  zoom = 9 
}) => {

  
  // Transform and validate coordinates using utility
  const transformCoordinates = (coords) => {
    return normalizeCoordinates(coords);
  };

  // Validate and transform single route (для обратной совместимости)
  const validRoute = Array.isArray(route) && route.length > 1 && route.every(point => Array.isArray(point) && point.length === 2);
  const transformedRoute = validRoute ? route.map(coords => transformCoordinates(coords)).filter(Boolean) : [];
  
  // Check if all coordinates are the same using utility
  const hasUniqueCoordinates = !arePointsSame(transformedRoute);

  // Обработка множественных маршрутов
  const processRoutes = () => {
    if (!Array.isArray(routes) || routes.length === 0) {
      return [];
    }

    // Массив цветов для задач
    const taskColors = [
      '#FF0000', // Красный
      '#00FF00', // Зеленый
      '#0000FF', // Синий
      '#FFA500', // Оранжевый
      '#800080', // Фиолетовый
      '#FFC0CB', // Розовый
      '#00FFFF', // Голубой
      '#FFFF00', // Желтый
      '#FF4500', // Оранжево-красный
      '#32CD32', // Лаймовый
      '#FF1493', // Глубокий розовый
      '#00CED1', // Темно-голубой
      '#FFD700', // Золотой
      '#FF69B4', // Горячий розовый
      '#20B2AA', // Светло-морской
    ];

    // Создаем карту цветов для задач
    const taskColorMap = {};
    let colorIndex = 0;

    return routes.map((routeData, routeIndex) => {
      const positions = routeData.positions || [];
      const coordinates = positions.map(pos => [pos.latitude, pos.longitude]);
      const transformedCoords = coordinates.map(coords => transformCoordinates(coords)).filter(Boolean);
      
      // Определяем цвет маршрута
      let routeColor = '#FF0000'; // По умолчанию красный
      let routeOpacity = 0.8;
      
      if (routeData.route_type === 'task') {
        // Используем уникальный цвет для каждой задачи
        if (!taskColorMap[routeData.task_id]) {
          taskColorMap[routeData.task_id] = taskColors[colorIndex % taskColors.length];
          colorIndex++;
        }
        routeColor = taskColorMap[routeData.task_id];
      } else if (routeData.route_type === 'session') {
        routeColor = '#808080'; // Серый для сессий без задач
        routeOpacity = 0.6;
      }

      return {
        ...routeData,
        coordinates: transformedCoords,
        color: routeColor,
        opacity: routeOpacity,
        hasUniqueCoordinates: !arePointsSame(transformedCoords),
        canRenderLine: transformedCoords.length > 1 && !arePointsSame(transformedCoords)
      };
    });
  };

  const processedRoutes = processRoutes();

  // Рассчитываем центр и зум на основе маршрутов
  const calculatedCenter = routes.length > 0 ? calculateRouteCenter(routes) : center;
  const calculatedZoom = routes.length > 0 ? calculateOptimalZoom(routes, zoom) : zoom;



  // Filter and transform employee coordinates
  const validEmployees = employees.filter(emp => emp && (
    (emp.coordinates && Array.isArray(emp.coordinates)) || 
    (emp.coordinates && emp.coordinates.latitude !== undefined && emp.coordinates.longitude !== undefined)
  ));

  const mapState = {
    center: calculatedCenter,
    zoom: calculatedZoom,
    controls: ['zoomControl', 'fullscreenControl']
  };

  return (
    <Box sx={{ width: '100%', height: '600px', borderRadius: 1, overflow: 'hidden' }}>
      <YMaps query={{ apikey: YANDEX_MAPS_API_KEY, lang: 'ru_RU' }}>
        <YandexMapComponent
          key={`map-${routes.length}-${JSON.stringify(calculatedCenter)}`}
          state={mapState}
          width="100%"
          height="100%"
          modules={['control.ZoomControl', 'control.FullscreenControl']}
        >
          {/* Рендерим множественные маршруты */}
          {processedRoutes.map((routeData, routeIndex) => (
            <React.Fragment key={`route-${routeIndex}`}>
              {routeData.canRenderLine && (
                <Polyline
                  geometry={routeData.coordinates}
                  options={{
                    strokeColor: routeData.color,
                    strokeWidth: 4,
                    strokeOpacity: routeData.opacity,
                  }}
                />
              )}
              
              {/* Маркеры для точек маршрута */}
              {routeData.coordinates.length > 0 && (
                <>
                  {/* Начальная точка */}
                  <Placemark
                    geometry={routeData.coordinates[0]}
                    properties={{ 
                      balloonContent: `
                        <strong>${routeData.route_type === 'task' ? 'Задача' : 'Без задачи'}</strong><br/>
                        ${routeData.route_type === 'task' ? `Название: ${routeData.task_title}<br/>Статус: ${routeData.task_status}` : ''}
                        Начало: ${new Date(routeData.session_start).toLocaleString()}<br/>
                        Координаты: ${routeData.coordinates[0][0]}, ${routeData.coordinates[0][1]}
                      `
                    }}
                    options={{ 
                      preset: 'islands#redDotIcon',
                      iconColor: routeData.color
                    }}
                    modules={['geoObject.addon.balloon']}
                  />
                  
                  {/* Конечная точка */}
                  {routeData.coordinates.length > 1 && (
                    <Placemark
                      geometry={routeData.coordinates[routeData.coordinates.length - 1]}
                      properties={{ 
                        balloonContent: `
                          <strong>${routeData.route_type === 'task' ? 'Задача' : 'Без задачи'}</strong><br/>
                          ${routeData.route_type === 'task' ? `Название: ${routeData.task_title}<br/>Статус: ${routeData.task_status}` : ''}
                          Конец: ${new Date(routeData.session_end || routeData.session_start).toLocaleString()}<br/>
                          Координаты: ${routeData.coordinates[routeData.coordinates.length - 1][0]}, ${routeData.coordinates[routeData.coordinates.length - 1][1]}
                        `
                      }}
                      options={{ 
                        preset: 'islands#redDotIcon',
                        iconColor: routeData.color
                      }}
                      modules={['geoObject.addon.balloon']}
                    />
                  )}
                  
                  {/* Промежуточные точки (если маршрут не отображается как линия) */}
                  {!routeData.canRenderLine && routeData.coordinates.length > 0 && (
                    routeData.coordinates.map((coords, pointIndex) => (
                      <Placemark
                        key={`route-point-${routeIndex}-${pointIndex}`}
                        geometry={coords}
                        properties={{ 
                          balloonContent: `
                            <strong>${routeData.route_type === 'task' ? 'Задача' : 'Без задачи'}</strong><br/>
                            ${routeData.route_type === 'task' ? `Название: ${routeData.task_title}<br/>Статус: ${routeData.task_status}` : ''}
                            Точка ${pointIndex + 1}<br/>
                            Время: ${new Date(routeData.positions[pointIndex]?.timestamp).toLocaleString()}<br/>
                            Координаты: ${coords[0]}, ${coords[1]}
                          `
                        }}
                        options={{ 
                          preset: 'islands#blueDotIcon',
                          iconColor: routeData.color
                        }}
                        modules={['geoObject.addon.balloon']}
                      />
                    ))
                  )}
                </>
              )}
            </React.Fragment>
          ))}

          {/* Обратная совместимость с одиночным маршрутом */}
          {transformedRoute.length > 1 && hasUniqueCoordinates && (
            <>
              <Polyline
                geometry={transformedRoute}
                options={{
                  strokeColor: '#FF0000',
                  strokeWidth: 4,
                  strokeOpacity: 0.8,
                }}
              />
              <Placemark
                geometry={transformedRoute[0]}
                properties={{ balloonContent: 'Начало маршрута' }}
                options={{ preset: 'islands#redDotIcon' }}
                modules={['geoObject.addon.balloon']}
              />
              <Placemark
                geometry={transformedRoute[transformedRoute.length - 1]}
                properties={{ balloonContent: 'Конец маршрута' }}
                options={{ preset: 'islands#redDotIcon' }}
                modules={['geoObject.addon.balloon']}
              />
            </>
          )}
          
          {/* Show route points even if line is not visible */}
          {transformedRoute.length > 0 && !hasUniqueCoordinates && (
            <>
              {transformedRoute.map((coords, index) => (
                <Placemark
                  key={`route-point-${index}`}
                  geometry={coords}
                  properties={{ 
                    balloonContent: `Точка маршрута ${index + 1}<br/>Координаты: ${coords[0]}, ${coords[1]}` 
                  }}
                  options={{ 
                    preset: 'islands#blueDotIcon',
                    iconColor: index === 0 ? '#FF0000' : index === transformedRoute.length - 1 ? '#00FF00' : '#0000FF'
                  }}
                  modules={['geoObject.addon.balloon']}
                />
              ))}
            </>
          )}
          
          {points.map((point, index) => {
            const coords = transformCoordinates(point.coordinates);
            if (!coords) return null;
            return (
              <Placemark
                key={index}
                geometry={coords}
                properties={{
                  balloonContent: point.description || `Точка ${index + 1}`,
                  iconCaption: point.time || '',
                }}
                modules={['geoObject.addon.balloon']}
              />
            );
          })}
          
          {validEmployees.map((employee, index) => {
            const coords = transformCoordinates(employee.coordinates);
            if (!coords) return null;
            return (
              <Placemark
                key={index}
                geometry={coords}
                properties={{
                  balloonContent: `<strong>${employee.name}</strong><br/>Последнее обновление: ${employee.lastUpdate}`,
                  iconCaption: employee.name,
                }}
                options={{ preset: 'islands#bluePersonIcon' }}
                modules={['geoObject.addon.balloon']}
              />
            );
          })}
        </YandexMapComponent>
      </YMaps>
    </Box>
  );
};

export default YandexMap;