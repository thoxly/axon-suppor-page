-- Миграция: Обновление внешнего ключа sessions.task_id
-- Дата: 2025-07-31
-- Описание: Изменение поведения внешнего ключа на SET NULL при удалении задачи

-- Сначала удаляем существующий внешний ключ
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_task_id_fkey;

-- Создаем новый внешний ключ с ON DELETE SET NULL
ALTER TABLE sessions
ADD CONSTRAINT sessions_task_id_fkey 
FOREIGN KEY (task_id) 
REFERENCES tasks(id) 
ON DELETE SET NULL; 