# ELMA365 Requests API

Базовый URL

```
https://elma-dev.copycon.ru/pub/v1
```

Все запросы выполняются методом **POST**.

---

# 1. Получение списка заявок

Получение списка заявок по фильтру (например по компании, инициатору и статусу).

## Endpoint

```
POST /app/requests/requests/list
```

## Пример запроса

```json
{
  "active": true,
  "filter": {
    "tf": {
      "company": ["019cbd28-e333-74ba-b8dc-b1ac3b72cf0d"],
      "iniciator": ["019cbd6d-faec-7347-8354-8a98815312e5"],
      "__status": [3]
    }
  },
  "from": 0,
  "fields": {
    "*": true
  }
}
```

## Параметры фильтра

| Поле | Тип | Описание |
|-----|-----|----------|
| company | array(UUID) | ID компании |
| iniciator | array(UUID) | ID пользователя инициатора |
| __status | array(number) | статус заявки |

Фильтр передается внутри:

```
filter.tf
```

---

## Статусы заявок

| Код | Статус |
|----|-------|
| 1 | new |
| 2 | planned |
| 3 | assigned |
| 4 | in_work |
| 5 | waiting |
| 6 | solved |
| 7 | closed |

Пример фильтра по статусу:

```json
"__status": [3]
```

Вернет заявки со статусом **assigned**.

---

## Основные поля ответа

Ответ содержит массив:

```
result.result
```

Основные поля объекта заявки:

| Поле | Описание |
|-----|----------|
| __id | ID заявки |
| __index | номер заявки |
| __name | системное имя |
| headers | заголовок |
| problem_description | описание |
| urgency | приоритет |
| category | категория |
| company | ID компании |
| iniciator | ID инициатора |
| executor | исполнитель |
| __status.status | числовой статус |
| creation_date | дата создания |
| deadline_date | срок выполнения |

### Пример ответа (сокращенный)

```json
{
  "success": true,
  "error": "",
  "result": {
    "result": [
      {
        "__id": "019cbd6e-935d-749c-80fa-2173dd044c6a",
        "__index": 1448,
        "__name": "1448 # Нужно автоматизировать процесс согласования",
        "headers": "Нужно автоматизировать процесс согласования",
        "__status": {
          "order": 0,
          "status": 3
        },
        "company": [
          "019cbd28-e333-74ba-b8dc-b1ac3b72cf0d"
        ],
        "iniciator": [
          "019cbd6d-faec-7347-8354-8a98815312e5"
        ]
      }
    ],
    "total": 1
  }
}
```

---

# 2. Получение конкретной заявки

Для работы с конкретной заявкой используется её идентификатор:

```
__id
```

## Endpoint

```
POST /app/requests/requests/{id}/get
```

## Пример

```
POST /app/requests/requests/019cbd6e-935d-749c-80fa-2173dd044c6a/get
```

## Ответ

В ответе возвращается объект заявки:

```
item
```

### Основные поля

| Поле | Описание |
|-----|----------|
| __id | ID заявки |
| __index | номер заявки |
| headers | тема заявки |
| problem_description | описание |
| urgency | приоритет |
| category | категория |
| company | компания |
| iniciator | инициатор |
| executor | исполнитель |
| __status.status | статус |
| status_history | история статусов |
| attached_file | прикрепленные файлы |

### Пример ответа (сокращенный)

```json
{
  "success": true,
  "error": "",
  "item": {
    "__id": "019cbd6e-935d-749c-80fa-2173dd044c6a",
    "__index": 1448,
    "headers": "Нужно автоматизировать процесс согласования",
    "problem_description": "<p>Описание проблемы</p>",
    "__status": {
      "order": 0,
      "status": 3
    },
    "company": [
      "019cbd28-e333-74ba-b8dc-b1ac3b72cf0d"
    ],
    "iniciator": [
      "019cbd6d-faec-7347-8354-8a98815312e5"
    ]
  }
}
```

---

# 3. Создание заявки

## Endpoint

```
POST /app/requests/requests/create
```

## Тело запроса

```json
{
  "context": {
    "company": ["019cbd28-e333-74ba-b8dc-b1ac3b72cf0d"],
    "iniciator": ["019cbd6d-faec-7347-8354-8a98815312e5"],
    "headers": "Тема заявки",
    "problem_description": "Описание проблемы",
    "urgency": [
      { "code": "low" }
    ],
    "category": [
      { "code": "general" }
    ]
  },
  "withEventForceCreate": true
}
```

---

## Обязательные поля

| Поле | Описание |
|-----|----------|
| company | ID компании |
| iniciator | ID инициатора |
| headers | тема заявки |
| problem_description | описание проблемы |
| urgency | приоритет |
| category | категория |

---

## Значения urgency

| code |
|------|
| very_low |
| low |
| medium |
| high |
| very_high |

Пример:

```json
"urgency": [
  { "code": "low" }
]
```

---

## Значение category

По умолчанию используется:

```
general
```

Пример:

```json
"category": [
  { "code": "general" }
]
```

---

## Ответ при создании

В ответе возвращается созданная заявка.

### Пример ответа

```json
{
  "success": true,
  "error": "",
  "item": {
    "__id": "019cbdb6-ffc0-772c-83ec-28bd181aae24",
    "__index": 1450,
    "__name": "1450 # Тема заявки",
    "__status": {
      "order": 0,
      "status": 1
    },
    "headers": "Тема заявки",
    "problem_description": "Описание проблемы",
    "company": [
      "019cbd28-e333-74ba-b8dc-b1ac3b72cf0d"
    ],
    "iniciator": [
      "019cbd6d-faec-7347-8354-8a98815312e5"
    ],
    "urgency": [
      {
        "code": "low",
        "name": "Низкая"
      }
    ],
    "category": [
      {
        "code": "general",
        "name": "О/Ф"
      }
    ]
  }
}
```

После создания заявка автоматически получает статус:

```
1 = new
```

---

# 4. Проверка существования пользователя

Используется для поиска пользователя по email.

## Endpoint

```
POST /app/_clients/_contacts/list
```

Возвращает список пользователей.  
Если пользователь не найден — ответ будет успешный (`200`), но массив `result` будет пустым.

---

## Пример запроса

```json
{
  "active": true,
  "filter": {
    "tf": {
      "_email": "ivan@essen.ru"
    }
  },
  "fields": {
    "*": true
  }
}
```

---

## Пример ответа

```json
{
  "success": true,
  "error": "",
  "result": {
    "result": [
      {
        "__id": "019cbd6d-faec-7347-8354-8a98815312e5",
        "__name": "Эссен Смирнов Иван Петрович",
        "__index": 1072,
        "_email": [
          {
            "type": "work",
            "email": "ivan@essen.ru",
            "isValid": true
          }
        ],
        "_fullname": {
          "lastname": "Смирнов",
          "firstname": "Иван",
          "middlename": "Петрович"
        },
        "_companies": [
          "019cbd28-e333-74ba-b8dc-b1ac3b72cf0d"
        ]
      }
    ],
    "total": 1
  }
}
```

---

## Основные поля пользователя

| Поле | Описание |
|-----|----------|
| __id | ID пользователя |
| __name | отображаемое имя |
| _fullname | структура ФИО |
| _email | email пользователя |
| _companies | компании пользователя |
| __index | внутренний номер |

---

## Логика проверки пользователя

1. Выполняется поиск по email.
2. Если `result.result` пустой → пользователь не найден.
3. Если массив содержит элемент → пользователь найден.

Пример проверки:

```
result.result.length > 0
```

Если условие выполняется — пользователь существует.