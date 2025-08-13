# Стандарт координат в проекте Employee Management

## Общий принцип

Во всем проекте используется единый стандарт для координат: **массив из двух чисел в формате `[latitude, longitude]`**.

## Форматы координат

### 1. Стандартный формат (внутренний)

```javascript
[latitude, longitude]; // массив из двух чисел
```

### 2. Формат базы данных

```sql
latitude DOUBLE PRECISION NOT NULL,
longitude DOUBLE PRECISION NOT NULL
```

### 3. Формат Telegram API

```javascript
{
  latitude: number,
  longitude: number
}
```

### 4. Формат Яндекс.Карт

```javascript
[latitude, longitude]; // массив из двух чисел (без изменений)
```

## Утилиты для работы с координатами

### Frontend (`frontend/src/utils/coordinates.js`)

```javascript
import {
  normalizeCoordinates,
  fromDatabase,
  fromTelegram,
  toDatabase,
  toYandexMaps,
  calculateCenter,
  arePointsSame,
  DEFAULT_COORDINATES,
} from "../utils/coordinates";

// Преобразование из любого формата в стандартный
const coords = normalizeCoordinates({
  latitude: 55.751244,
  longitude: 37.618423,
});
// Результат: [55.751244, 37.618423]

// Преобразование из базы данных
const coords = fromDatabase({ latitude: 55.751244, longitude: 37.618423 });
// Результат: [55.751244, 37.618423]

// Преобразование из Telegram API
const coords = fromTelegram({ latitude: 55.751244, longitude: 37.618423 });
// Результат: [55.751244, 37.618423]

// Преобразование для базы данных
const dbFormat = toDatabase([55.751244, 37.618423]);
// Результат: { latitude: 55.751244, longitude: 37.618423 }

// Вычисление центра между точками
const center = calculateCenter([
  [55.751244, 37.618423],
  [55.752244, 37.619423],
]);

// Проверка, находятся ли точки в одном месте
const isSame = arePointsSame([
  [55.751244, 37.618423],
  [55.751244, 37.618423],
]);
```

### Backend (`backend/utils/coordinates.js`)

```javascript
const {
  fromDatabase,
  fromTelegram,
  toDatabase,
  isValidCoordinates,
  calculateCenter,
} = require("./utils/coordinates");

// Аналогичные функции для backend
```

## Правила использования

### 1. В базе данных

- Храним как `latitude` и `longitude` (отдельные поля)
- Тип: `DOUBLE PRECISION`
- Обязательные поля

### 2. В API запросах/ответах

- Отправляем как объект: `{ latitude: number, longitude: number }`
- Получаем как объект: `{ latitude: number, longitude: number }`

### 3. В компонентах React

- Используем массив: `[latitude, longitude]`
- Всегда используем утилиты для преобразования

### 4. В Telegram Bot

- Получаем от Telegram как объект: `{ latitude, longitude }`
- Преобразуем в стандартный формат перед сохранением

### 5. В Яндекс.Картах

- Передаем как массив: `[latitude, longitude]`
- Без дополнительных преобразований

## Примеры использования

### Сохранение позиции в Telegram Bot

```javascript
const coords = fromTelegram(location);
if (coords) {
  await locationService.savePosition(
    user.id,
    session.id,
    coords[0], // latitude
    coords[1], // longitude
    new Date()
  );
}
```

### Отображение на карте

```javascript
const coords = fromDatabase(positionResponse.position);
if (coords) {
  setCurrentLocation(coords);
}
```

### Получение маршрута

```javascript
const route = positions.map((pos) => fromDatabase(pos));
// route теперь содержит массив координат в формате [[lat, lng], [lat, lng], ...]
```

## Дефолтные координаты

```javascript
const DEFAULT_COORDINATES = [55.751244, 37.618423]; // Москва
```

## Валидация

Все координаты должны проходить валидацию:

- Широта: от -90 до 90
- Долгота: от -180 до 180
- Оба значения должны быть числами

## Миграция

При добавлении новых функций работы с координатами:

1. Используйте утилиты из `coordinates.js`
2. Не создавайте собственные преобразования
3. Следуйте стандарту `[latitude, longitude]`
4. Добавляйте валидацию через `isValidCoordinates()`

## Отладка

Для отладки проблем с координатами:

1. Проверьте формат данных на каждом этапе
2. Используйте `console.log` для вывода координат
3. Убедитесь, что используются правильные утилиты
4. Проверьте валидность координат через `isValidCoordinates()`
