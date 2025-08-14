# Система валидации координат для борьбы с подменой GPS

## Обзор

Система валидации координат предназначена для детекции и предотвращения подмены GPS координат сотрудниками. Особенно актуально в зонах с глушилками GPS (аэропорты, административные здания) или при использовании поддельных GPS приложений.

## Проблемы, которые решает система

### 1. **Глушилки GPS в зонах ограниченного доступа**

- Аэропорты, административные здания, военные объекты
- Координаты сдвигаются на постоянное расстояние (например, 1-2 км)
- Пользователь физически находится в нужном месте, но GPS показывает неверные координаты

### 2. **Поддельные GPS приложения**

- Приложения для "подмены" местоположения
- Координаты могут "прыгать" между реальными и поддельными
- Телепортация на большие расстояния

### 3. **Технические сбои GPS**

- Неточные координаты из-за плохого сигнала
- Подозрительно точные координаты (признак симуляции)

## Архитектура системы

### Компоненты

1. **CoordinateValidator** (`backend/utils/coordinateValidator.js`)

   - Основной класс для валидации координат
   - Реализует алгоритмы детекции подмены

2. **CoordinateProcessor** (`backend/utils/coordinateProcessor.js`)

   - Интегрирует валидацию с существующей обработкой координат
   - Включает адаптивную фильтрацию и кластеризацию

3. **LocationService** (`bot/services/location.service.js`)
   - Валидация в реальном времени при сохранении координат
   - Интеграция с Telegram ботом

### Алгоритмы детекции

#### 1. **Анализ отклонения от ожидаемого места**

```javascript
// Проверяет расстояние до ожидаемых координат задачи
const distance = calculateDistance(actualCoords, expectedCoords);
if (distance > maxAllowedDeviationKm) {
  // Подозрительное отклонение
}
```

#### 2. **Детекция постоянного сдвига (глушилки)**

```javascript
// Анализирует консистентность сдвига относительно ожидаемой точки
const shifts = positions.map((pos) => ({
  latShift: pos.coords[0] - expectedCoords[0],
  lngShift: pos.coords[1] - expectedCoords[1],
}));

// Если все сдвиги примерно одинаковые - возможна глушилка
```

#### 3. **Детекция телепортации**

```javascript
// Проверяет нереалистичную скорость перемещения
const speed = distance / timeDiffHours;
if (speed > maxSpeedKmh * teleportationMultiplier) {
  // Возможная телепортация
}
```

#### 4. **Анализ подозрительной точности**

```javascript
// Проверяет "идеальные" координаты (признак симуляции)
const hasRepeatingZeros = /0{4,}/.test(coordString);
const isTooRound = fractionalPart < suspiciousAccuracyThreshold;
```

#### 5. **Анализ паттернов движения**

- Движение по идеально прямой линии (нереалистично в городе)
- Резкие скачки скорости
- Неестественное ускорение/замедление

## Настройка и использование

### 1. **Настройка ожидаемых координат для задач**

При создании задачи указывайте ожидаемые координаты:

```javascript
const task = {
  title: "Доставка в аэропорт",
  address: "Аэропорт Шереметьево, терминал D",
  expected_latitude: 55.9728,
  expected_longitude: 37.4147,
  max_deviation_km: 3.0, // 3 км допустимое отклонение
};
```

### 2. **Миграция базы данных**

Выполните миграцию для добавления полей в таблицу задач:

```sql
-- Запустите файл migrations/add_expected_coordinates_to_tasks.sql
psql -d employee_management -f backend/migrations/add_expected_coordinates_to_tasks.sql
```

### 3. **Настройка валидатора**

```javascript
const validator = new CoordinateValidator({
  maxAllowedDeviationKm: 5.0, // Максимальное отклонение от ожидаемого места
  consistentShiftThreshold: 0.001, // Порог для детекции постоянного сдвига (~100м)
  suspiciousAccuracyThreshold: 0.00001, // Порог подозрительной точности
  teleportationMultiplier: 3, // Множитель для детекции телепортации
});
```

### 4. **Уровни риска и действия**

#### **LOW** - Низкий риск

- Координаты принимаются без ограничений
- Логируются для анализа

#### **MEDIUM** - Средний риск

- Координаты принимаются с предупреждениями
- Помечаются для ручной проверки
- Возможны помехи GPS

#### **HIGH** - Высокий риск

- Координаты отклоняются
- Требуется дополнительная верификация
- Пользователю отправляется уведомление

## Примеры использования

### Сценарий 1: Работа в аэропорту

```javascript
// Задача в аэропорту Шереметьево
const expectedCoords = [55.9728, 37.4147];

// GPS показывает сдвинутые координаты из-за глушилки
const actualCoords = [55.9828, 37.4247]; // +1км сдвиг

// Система детектирует постоянный сдвиг
const validation = validator.validateCoordinates(actualCoords, {
    expectedCoords: expectedCoords,
    previousPositions: [...] // предыдущие позиции с таким же сдвигом
});

// Результат: MEDIUM риск, warning: "consistent_shift"
// Координаты принимаются с пометкой о возможных помехах GPS
```

### Сценарий 2: Подделка GPS

```javascript
// Сотрудник пытается "телепортироваться" в другой город
const actualCoords = [59.9311, 30.3609]; // Санкт-Петербург
const expectedCoords = [55.7558, 37.6173]; // Москва

const validation = validator.validateCoordinates(actualCoords, {
  expectedCoords: expectedCoords,
  lastPosition: { coords: [55.756, 37.6175], timestamp: prevTime },
  timeDiff: 60000, // 1 минута
});

// Результат: HIGH риск, warnings: ["location_deviation", "teleportation"]
// Координаты отклоняются, требуется верификация
```

## Мониторинг и логирование

### Логи валидации

```
🔍 Validation filtering: 10 -> 8 positions (2 rejected, 1 flagged)
🚫 Position rejected by validation: Обнаружены подозрительные координаты
⚠️ Saved position with warnings: consistent_shift, location_deviation
```

### Статистика в результатах обработки

```javascript
{
    validationSummary: {
        stats: {
            total: 100,
            accepted: 85,
            flagged: 10,
            rejected: 5
        },
        highRiskPositions: [...],
        flaggedPositions: [...]
    }
}
```

## Тестирование

Запустите тесты для проверки работы системы:

```bash
cd backend
node test-coordinate-validation.js
```

Тесты покрывают следующие сценарии:

- Нормальная работа без подмены
- Телепортация в другой город
- Постоянный сдвиг координат (глушилки)
- Подозрительно точные координаты
- Движение по прямой линии

## Настройка для продакшена

### 1. **Геокодирование адресов**

Интегрируйте сервис геокодирования для автоматического получения координат из адресов задач:

```javascript
// Пример интеграции с Yandex Geocoder API
async function geocodeAddress(address) {
  const response = await fetch(
    `https://geocode-maps.yandex.ru/1.x/?geocode=${encodeURIComponent(
      address
    )}&format=json`
  );
  // ... обработка ответа
  return [latitude, longitude];
}
```

### 2. **Уведомления менеджеров**

Настройте отправку уведомлений при обнаружении подозрительных координат:

```javascript
if (validation.riskLevel === "HIGH") {
  await notifyManager(userId, taskId, validation.warnings);
}
```

### 3. **Аналитика и отчеты**

Собирайте статистику для анализа:

- Процент отклоненных координат по зонам
- Типичные паттерны подмены
- Эффективность алгоритмов детекции

## Ограничения и рекомендации

### Ограничения

- Система не может на 100% отличить глушилку от подделки
- Требует настройки ожидаемых координат для каждой задачи
- Может давать ложные срабатывания в зонах с плохим GPS

### Рекомендации

- Используйте дополнительные методы верификации (фото, подтверждение)
- Настраивайте пороги под конкретные условия работы
- Анализируйте статистику для улучшения алгоритмов
- Обучайте сотрудников работе в зонах с помехами GPS

## API endpoints

### Получение статистики валидации

```http
GET /api/coordinate-processing/session/{sessionId}/stats
```

### Настройка параметров валидации

```http
PUT /api/coordinate-processing/settings
{
    "enableValidation": true,
    "maxAllowedDeviationKm": 5.0,
    "consistentShiftThreshold": 0.001
}
```

### Создание задачи с ожидаемыми координатами

```http
POST /api/tasks
{
    "title": "Задача",
    "address": "Адрес",
    "expected_latitude": 55.7558,
    "expected_longitude": 37.6173,
    "max_deviation_km": 3.0
}
```
