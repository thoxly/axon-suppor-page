# Устранение проблем с переменными окружения

## Проблема: "API ключ для Геосаджеста не настроен"

### 1. Проверьте файл .env

Убедитесь, что в файле `frontend/.env` есть следующие строки:

```env
REACT_APP_GEOSUGGEST=ваш_ключ_геосаджеста
REACT_APP_YANDEX_MAP_JS_API=ваш_ключ_яндекс_карт
```

### 2. Перезапустите сервер разработки

После изменения файла `.env` необходимо перезапустить сервер разработки:

```bash
# Остановите сервер (Ctrl+C)
# Затем запустите заново
npm start
```

### 3. Проверьте консоль браузера

Откройте консоль браузера (F12) и проверьте:

1. Есть ли сообщения о переменных окружения
2. Выполните команду: `window.testEnvVars()`

### 4. Проверьте формат файла .env

Убедитесь, что:

- Файл называется именно `.env` (с точкой в начале)
- Нет пробелов вокруг знака `=`
- Нет кавычек вокруг значений
- Нет комментариев на той же строке

**Правильно:**

```env
REACT_APP_GEOSUGGEST=your_key_here
```

**Неправильно:**

```env
REACT_APP_GEOSUGGEST = your_key_here
REACT_APP_GEOSUGGEST="your_key_here"
REACT_APP_GEOSUGGEST=your_key_here # комментарий
```

### 5. Проверьте расположение файла

Файл `.env` должен находиться в корневой папке `frontend/`, а не в `src/` или других папках.

### 6. Получение API ключей

Если у вас нет API ключей:

1. Зайдите на [Яндекс.Облако](https://cloud.yandex.ru/)
2. Создайте платежный аккаунт (если нет)
3. Создайте сервисный аккаунт
4. Получите API ключи для:
   - Геосаджест API
   - JavaScript API и HTTP Геокодер

### 7. Временное решение для тестирования

Если API ключи еще не получены, можно временно отключить проверку:

```javascript
// В файле frontend/src/components/common/AddressAutocomplete.js
// Закомментируйте или измените проверку:

useEffect(() => {
  console.log("AddressAutocomplete: Checking API keys...");
  const keys = checkApiKeys();
  console.log("AddressAutocomplete: API keys status:", keys);

  // Временно отключаем проверку для тестирования
  // if (!keys.geosuggest) {
  //   setApiError('API ключ для Геосаджеста не настроен');
  // } else {
  //   setApiError('');
  // }
  setApiError(""); // Временно убираем ошибку
}, []);
```

### 8. Проверка в production

В production окружении переменные окружения должны быть настроены на сервере или в системе CI/CD.

### 9. Дополнительная диагностика

Если проблема остается, выполните в консоли браузера:

```javascript
// Проверка всех переменных окружения
console.log("All env vars:", process.env);

// Проверка конкретных переменных
console.log("GEOSUGGEST:", process.env.REACT_APP_GEOSUGGEST);
console.log("YANDEX_MAP:", process.env.REACT_APP_YANDEX_MAP_JS_API);

// Проверка функции
window.testEnvVars();
```
