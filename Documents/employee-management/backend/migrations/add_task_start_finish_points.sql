-- Добавление полей для точки старта и точки финиша задачи
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_point_latitude DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_point_longitude DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS finish_point_latitude DOUBLE PRECISION;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS finish_point_longitude DOUBLE PRECISION;

-- Добавление комментариев к полям
COMMENT ON COLUMN tasks.start_point_latitude IS 'Широта точки старта задачи';
COMMENT ON COLUMN tasks.start_point_longitude IS 'Долгота точки старта задачи';
COMMENT ON COLUMN tasks.finish_point_latitude IS 'Широта точки финиша задачи';
COMMENT ON COLUMN tasks.finish_point_longitude IS 'Долгота точки финиша задачи';

-- Создание индексов для быстрого поиска по координатам
CREATE INDEX IF NOT EXISTS idx_tasks_start_point ON tasks(start_point_latitude, start_point_longitude);
CREATE INDEX IF NOT EXISTS idx_tasks_finish_point ON tasks(finish_point_latitude, finish_point_longitude); 