# Система обработки координат

## Обзор

Система обработки координат предназначена для улучшения качества GPS данных путем применения трех основных алгоритмов:

1. **Фильтрация по скорости** - отбрасывание нереалистичных перемещений
2. **Кластеризация** - группировка близких точек
3. **Медианное усреднение** - вычисление точной позиции из группы точек

## Архитектура

### Основные компоненты

- `CoordinateProcessor` - основной класс для обработки координат
- `CoordinateProcessingService` - сервис для интеграции с базой данных
- `coordinateProcessingController` - API контроллер
- API роуты для получения обработанных данных

### Алгоритмы

#### 1. Фильтрация по скорости

Отбрасывает точки с нереалистичной скоростью перемещения:

- Максимальная скорость: 100 км/ч (настраивается)
- Минимальная скорость: 0.1 км/ч (настраивается)

```javascript
const processor = new CoordinateProcessor({
  maxSpeedKmh: 100,
  minSpeedKmh: 0.1,
});
```

#### 2. Кластеризация

Группирует точки в радиусе 20 метров (настраивается):

```javascript
const processor = new CoordinateProcessor({
  clusterRadiusMeters: 20,
});
```

#### 3. Медианное усреднение

Вычисляет медиану координат в кластере для устойчивости к выбросам:

```javascript
const processor = new CoordinateProcessor({
  minPointsForMedian: 3, // минимум 3 точки для медианы
});
```

## API Endpoints

### Получение обработанных координат сессии

```
GET /api/coordinate-processing/sessions/:sessionId/coordinates
```

**Ответ:**

```json
{
  "sessionId": 123,
  "coordinates": [
    {
      "latitude": 55.751244,
      "longitude": 37.618423,
      "timestamp": "2024-01-01T12:00:00Z",
      "originalCount": 5
    }
  ],
  "count": 1
}
```

### Получение статистики сессии

```
GET /api/coordinate-processing/sessions/:sessionId/stats
```

**Ответ:**

```json
{
  "sessionInfo": {
    "id": 123,
    "user_id": 456,
    "task_id": 789,
    "start_time": "2024-01-01T12:00:00Z",
    "end_time": "2024-01-01T13:00:00Z",
    "is_active": false,
    "user_name": "Иван Иванов",
    "task_title": "Доставка документов"
  },
  "processingStats": {
    "originalCount": 150,
    "processedCount": 25,
    "reductionPercent": "83.3",
    "originalDistance": 2500,
    "processedDistance": 2300,
    "distanceChangePercent": "-8.0"
  },
  "originalCount": 150,
  "processedCount": 25
}
```

### Получение обработанных координат задачи

```
GET /api/coordinate-processing/tasks/:taskId/coordinates
```

### Получение статистики задачи

```
GET /api/coordinate-processing/tasks/:taskId/stats
```

### Настройки обработки

#### Получение настроек

```
GET /api/coordinate-processing/settings
```

**Ответ:**

```json
{
  "maxSpeedKmh": 100,
  "minSpeedKmh": 0.1,
  "clusterRadiusMeters": 20,
  "timeWindowMs": 30000,
  "minPointsForMedian": 3
}
```

#### Обновление настроек (только для менеджеров)

```
PUT /api/coordinate-processing/settings
```

**Тело запроса:**

```json
{
  "maxSpeedKmh": 80,
  "clusterRadiusMeters": 15,
  "timeWindowMs": 45000
}
```

## Использование в коде

### Обработка координат сессии

```javascript
const coordinateProcessingService = require("./services/coordinateProcessing.service");

// Получить обработанные координаты
const coordinates =
  await coordinateProcessingService.getProcessedCoordinatesForMap(sessionId);

// Получить статистику
const stats = await coordinateProcessingService.getSessionStats(sessionId);
```

### Обработка координат задачи

```javascript
// Получить обработанные координаты по всем сессиям задачи
const coordinates =
  await coordinateProcessingService.getTaskProcessedCoordinates(taskId);

// Получить общую статистику задачи
const stats = await coordinateProcessingService.getTaskStats(taskId);
```

### Прямое использование процессора

```javascript
const CoordinateProcessor = require("./utils/coordinateProcessor");

const processor = new CoordinateProcessor({
  maxSpeedKmh: 100,
  clusterRadiusMeters: 20,
  timeWindowMs: 30000,
});

const positions = [
  { coords: [55.751244, 37.618423], timestamp: new Date() },
  // ... другие позиции
];

const processed = processor.processCoordinates(positions);
const stats = processor.getProcessingStats(positions, processed);
```

## Настройки по умолчанию

| Параметр              | Значение | Описание                            |
| --------------------- | -------- | ----------------------------------- |
| `maxSpeedKmh`         | 100      | Максимальная скорость в км/ч        |
| `minSpeedKmh`         | 0.1      | Минимальная скорость в км/ч         |
| `clusterRadiusMeters` | 20       | Радиус кластера в метрах            |
| `timeWindowMs`        | 30000    | Временное окно группировки (30 сек) |
| `minPointsForMedian`  | 3        | Минимум точек для медианы           |

## Тестирование

Запустите тесты для проверки работы системы:

```bash
cd backend
node test-coordinate-processing.js
```

Тесты включают:

- Синтетические данные с шумом и выбросами
- Различные настройки процессора
- Тестирование отдельных алгоритмов
- Тестирование с реальными данными из базы

## Примеры результатов

### До обработки

- 150 исходных точек
- Общее расстояние: 2500 метров
- Много шума и выбросов

### После обработки

- 25 обработанных точек
- Общее расстояние: 2300 метров
- Снижение количества точек на 83.3%
- Более точный маршрут

## Интеграция с фронтендом

### Получение координат для карты

```javascript
// В компоненте карты
const [coordinates, setCoordinates] = useState([]);

useEffect(() => {
  const fetchCoordinates = async () => {
    try {
      const response = await api.get(
        `/coordinate-processing/sessions/${sessionId}/coordinates`
      );
      setCoordinates(response.data.coordinates);
    } catch (error) {
      console.error("Error fetching coordinates:", error);
    }
  };

  fetchCoordinates();
}, [sessionId]);
```

### Отображение статистики

```javascript
const [stats, setStats] = useState(null);

useEffect(() => {
  const fetchStats = async () => {
    try {
      const response = await api.get(
        `/coordinate-processing/sessions/${sessionId}/stats`
      );
      setStats(response.data.processingStats);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  fetchStats();
}, [sessionId]);
```

## Преимущества системы

1. **Устойчивость к GPS ошибкам** - фильтрация выбросов и шума
2. **Реалистичные маршруты** - отбрасывание нереалистичных перемещений
3. **Бесплатное решение** - не требует внешних API
4. **Настраиваемость** - гибкие параметры для разных сценариев
5. **Производительность** - эффективные алгоритмы обработки

## Мониторинг и отладка

Система выводит подробные логи:

```
🔄 Starting coordinate processing for 150 positions
📊 Speed filtering: 150 -> 120 positions
⏰ Time grouping: 120 positions -> 8 groups
🎯 Clustering: 15 positions -> 3 clusters
✅ Coordinate processing completed: 150 -> 25 positions
```

Это помогает отслеживать эффективность каждого этапа обработки.
