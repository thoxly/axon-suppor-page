-- Add executor reference from ELMA365 to tickets
-- NOTE: Column may already exist in some environments; IF NOT EXISTS keeps migration idempotent.
alter table public.tickets
  add column if not exists elma_executor_id uuid;

