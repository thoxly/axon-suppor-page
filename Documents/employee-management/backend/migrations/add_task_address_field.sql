-- Добавление поля address в таблицу tasks
ALTER TABLE tasks ADD COLUMN address TEXT;

-- Добавление комментария к полю
COMMENT ON COLUMN tasks.address IS 'Адрес выполнения задачи'; 