-- Добавляем поля для завершения задач
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Создаем таблицу для фотографий задач
CREATE TABLE IF NOT EXISTS task_photos (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индекс для быстрого поиска фотографий по задаче
CREATE INDEX IF NOT EXISTS idx_task_photos_task_id ON task_photos(task_id); 