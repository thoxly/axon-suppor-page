-- Supabase schema for Service Desk portal
-- Run this script in the Supabase SQL editor to create tables and RLS policies.

-- Enum types
do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_author_type') then
    create type public.ticket_author_type as enum ('client', 'agent', 'system');
  end if;

  if not exists (select 1 from pg_type where typname = 'ticket_message_direction') then
    create type public.ticket_message_direction as enum ('outgoing', 'incoming');
  end if;

  if not exists (select 1 from pg_type where typname = 'elma_sync_status') then
    create type public.elma_sync_status as enum ('not_synced', 'queued', 'synced', 'failed');
  end if;
end
$$;

-- Profiles: 1:1 with auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  elma_contact_id uuid not null,
  elma_company_id uuid not null,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

-- Users can see and modify only their own profile
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can manage their own profile'
  ) then
    create policy "Users can manage their own profile"
      on public.profiles
      for all
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;

-- Tickets: mirror of ELMA365 requests, main key is elma_id
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  elma_id uuid not null unique,
  elma_index integer,
  elma_company_id uuid not null,
  elma_initiator_id uuid not null,
  headers text,
  problem_description text,
  urgency_code text,
  category_code text,
  status_code integer,
  creation_date timestamptz,
  deadline_date timestamptz,
  raw jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists tickets_elma_company_idx on public.tickets (elma_company_id);
create index if not exists tickets_elma_initiator_idx on public.tickets (elma_initiator_id);
create index if not exists tickets_status_code_idx on public.tickets (status_code);

alter table public.tickets enable row level security;

-- Users can see only tickets that belong to their company + contact
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tickets'
      and policyname = 'Users can view their own tickets'
  ) then
    create policy "Users can view their own tickets"
      on public.tickets
      for select
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.elma_company_id = tickets.elma_company_id
            and p.elma_contact_id = tickets.elma_initiator_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tickets'
      and policyname = 'Users can insert their own tickets'
  ) then
    create policy "Users can insert their own tickets"
      on public.tickets
      for insert
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.elma_company_id = elma_company_id
            and p.elma_contact_id = elma_initiator_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tickets'
      and policyname = 'Users can update their own tickets'
  ) then
    create policy "Users can update their own tickets"
      on public.tickets
      for update
      using (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.elma_company_id = elma_company_id
            and p.elma_contact_id = elma_initiator_id
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.elma_company_id = elma_company_id
            and p.elma_contact_id = elma_initiator_id
        )
      );
  end if;
end
$$;

-- Ticket messages: conversation per ELMA ticket
create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_elma_id uuid not null,
  author_profile_id uuid references public.profiles (id),
  author_type public.ticket_author_type not null default 'client',
  direction public.ticket_message_direction not null default 'outgoing',
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  elma_sync_status public.elma_sync_status not null default 'not_synced',
  elma_sync_error text
);

create index if not exists ticket_messages_ticket_elma_idx
  on public.ticket_messages (ticket_elma_id, created_at);

alter table public.ticket_messages enable row level security;

-- Users can see only messages for their own tickets
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_messages'
      and policyname = 'Users can view messages for their tickets'
  ) then
    create policy "Users can view messages for their tickets"
      on public.ticket_messages
      for select
      using (
        exists (
          select 1
          from public.tickets t
          join public.profiles p
            on p.id = auth.uid()
           and p.elma_company_id = t.elma_company_id
           and p.elma_contact_id = t.elma_initiator_id
          where t.elma_id = ticket_messages.ticket_elma_id
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ticket_messages'
      and policyname = 'Users can insert messages for their tickets'
  ) then
    create policy "Users can insert messages for their tickets"
      on public.ticket_messages
      for insert
      with check (
        exists (
          select 1
          from public.tickets t
          join public.profiles p
            on p.id = auth.uid()
           and p.elma_company_id = t.elma_company_id
           and p.elma_contact_id = t.elma_initiator_id
          where t.elma_id = ticket_elma_id
        )
      );
  end if;
end
$$;

