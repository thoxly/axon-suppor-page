-- Добавление полей ожидаемых координат для валидации GPS
-- Эти координаты будут использоваться для детекции подмены GPS

ALTER TABLE tasks 
ADD COLUMN expected_latitude DOUBLE PRECISION,
ADD COLUMN expected_longitude DOUBLE PRECISION,
ADD COLUMN expected_coordinates_source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'geocoded', 'address'
ADD COLUMN max_deviation_km DOUBLE PRECISION DEFAULT 5.0; -- максимальное допустимое отклонение в км

-- Добавляем индекс для быстрого поиска задач по координатам
CREATE INDEX idx_tasks_expected_coords ON tasks(expected_latitude, expected_longitude) 
WHERE expected_latitude IS NOT NULL AND expected_longitude IS NOT NULL;

-- Комментарии для документации
COMMENT ON COLUMN tasks.expected_latitude IS 'Ожидаемая широта места выполнения задачи для валидации GPS';
COMMENT ON COLUMN tasks.expected_longitude IS 'Ожидаемая долгота места выполнения задачи для валидации GPS';
COMMENT ON COLUMN tasks.expected_coordinates_source IS 'Источник ожидаемых координат: manual, geocoded, address';
COMMENT ON COLUMN tasks.max_deviation_km IS 'Максимальное допустимое отклонение от ожидаемых координат в километрах'; 