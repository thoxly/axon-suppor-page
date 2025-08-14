# Компонент автоподбора адреса с Яндекс API

## Описание

Реализован механизм автоподбора адреса с использованием Яндекс Геосаджеста и геокодера. Компонент позволяет:

- Автоматически получать подсказки адресов при вводе
- Геокодировать адрес в координаты
- Выбирать точку на карте
- Получать текущую геолокацию пользователя

## Настройка

### 1. Переменные окружения

Добавьте в файл `.env` следующие переменные:

```env
# Ключ для Яндекс Геосаджеста
REACT_APP_GEOSUGGEST=your_geosuggest_api_key

# Ключ для Яндекс HTTP-геокодера и карт
REACT_APP_YANDEX_MAP_JS_API=your_yandex_maps_api_key
```

### 2. Получение API ключей

1. **REACT_APP_GEOSUGGEST**: Получите в [Яндекс.Облаке](https://cloud.yandex.ru/) для сервиса "Геосаджест"
2. **REACT_APP_YANDEX_MAP_JS_API**: Получите в [Яндекс.Облаке](https://cloud.yandex.ru/) для сервиса "JavaScript API и HTTP Геокодер"

## Компоненты

### AddressAutocomplete

Основной компонент для ввода адреса с автоподбором.

```jsx
import AddressAutocomplete from "./components/common/AddressAutocomplete";

<AddressAutocomplete
  value={address}
  onChange={setAddress}
  onCoordinatesChange={setCoordinates}
  label="Адрес"
  placeholder="Введите адрес"
  required={true}
/>;
```

#### Пропсы

- `value` (string) - текущее значение адреса
- `onChange` (function) - обработчик изменения адреса
- `onCoordinatesChange` (function) - обработчик изменения координат
- `label` (string) - метка поля
- `placeholder` (string) - placeholder
- `error` (boolean) - наличие ошибки
- `helperText` (string) - вспомогательный текст
- `disabled` (boolean) - отключено ли поле
- `showMapPicker` (boolean) - показывать ли кнопку выбора на карте
- `required` (boolean) - обязательное поле
- `fullWidth` (boolean) - полная ширина
- `size` (string) - размер поля
- `sx` (object) - стили

### MapPointPicker

Компонент для выбора точки на карте.

```jsx
import MapPointPicker from "./components/common/MapPointPicker";

<MapPointPicker
  open={mapPickerOpen}
  onClose={() => setMapPickerOpen(false)}
  onPointSelect={handlePointSelect}
  initialCenter={[55.751244, 37.618423]}
  initialZoom={10}
/>;
```

#### Пропсы

- `open` (boolean) - открыто ли окно
- `onClose` (function) - обработчик закрытия
- `onPointSelect` (function) - обработчик выбора точки
- `initialCenter` (array) - начальный центр карты [lat, lng]
- `initialZoom` (number) - начальный зум
- `title` (string) - заголовок окна

## Утилиты

### yandexGeocoder.js

Содержит функции для работы с Яндекс API:

- `getAddressSuggestions(query, options)` - получение подсказок адресов
- `geocodeAddress(address)` - геокодирование адреса в координаты
- `reverseGeocode(latitude, longitude)` - обратное геокодирование
- `formatCoordinates(latitude, longitude)` - форматирование координат
- `checkApiKeys()` - проверка доступности API ключей

## Использование в TaskFormOffcanvas

Компонент интегрирован в форму создания/редактирования задач:

1. Удалены поля для ручного ввода координат
2. Добавлен компонент `AddressAutocomplete` для адреса
3. Координаты финишной точки автоматически заполняются при выборе адреса
4. Добавлена возможность выбора точки на карте

## Функциональность

### Автоподбор адреса

- При вводе текста автоматически запрашиваются подсказки
- Debounce 300ms для оптимизации запросов
- Отображение подсказок с названием и дополнительной информацией

### Геокодирование

- Автоматическое преобразование адреса в координаты
- Сохранение координат в форме задачи
- Обработка ошибок геокодирования

### Выбор на карте

- Открытие карты в модальном окне
- Клик по карте для выбора точки
- Автоматическое получение адреса по координатам
- Отображение выбранной точки маркером

### Геолокация

- Получение текущего местоположения пользователя
- Автоматическое заполнение адреса и координат
- Обработка ошибок геолокации

## Обработка ошибок

- Проверка доступности API ключей
- Обработка сетевых ошибок
- Уведомления пользователя о проблемах
- Fallback значения при ошибках

## Тестирование

Для тестирования компонента используйте файл `test-address-autocomplete.js`:

```javascript
// В консоли браузера
window.testAddressAutocomplete();
```

## Зависимости

- `@mui/material` - UI компоненты
- `@mui/icons-material` - иконки
- `@pbe/react-yandex-maps` - интеграция с Яндекс Картами
- `date-fns` - работа с датами

## Примечания

- Точка старта определяется при начале работы пользователя (отдельная задача)
- Точка финиша устанавливается через адрес или выбор на карте
- Координаты сохраняются в базе данных в полях `finish_point_latitude` и `finish_point_longitude`
- При выборе точки на карте адрес заполняется автоматически через обратное геокодирование
