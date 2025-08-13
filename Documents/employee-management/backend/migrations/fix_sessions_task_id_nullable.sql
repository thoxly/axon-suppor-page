-- Миграция: Сделать поле task_id в таблице sessions nullable
-- Дата: 2025-01-27
-- Описание: Разрешить создание сессий без привязанной задачи

-- Удаляем NOT NULL constraint с поля task_id
ALTER TABLE sessions 
ALTER COLUMN task_id DROP NOT NULL;

-- Обновляем комментарий к таблице для ясности
COMMENT ON COLUMN sessions.task_id IS 'ID задачи (может быть NULL если сессия создана до назначения задачи)'; 