-- Сначала удаляем все существующие состояния, так как они все равно устарели
DELETE FROM fsm_states;

-- Удаляем старый foreign key и индекс
ALTER TABLE fsm_states DROP CONSTRAINT IF EXISTS fsm_states_user_id_fkey;
DROP INDEX IF EXISTS fsm_states_user_id_idx;

-- Добавляем новую колонку telegram_id
ALTER TABLE fsm_states ADD COLUMN telegram_id BIGINT;

-- Удаляем старую колонку user_id
ALTER TABLE fsm_states DROP COLUMN user_id;

-- Создаем новый уникальный индекс
CREATE UNIQUE INDEX fsm_states_telegram_id_idx ON fsm_states(telegram_id);

-- Добавляем NOT NULL constraint
ALTER TABLE fsm_states ALTER COLUMN telegram_id SET NOT NULL; 