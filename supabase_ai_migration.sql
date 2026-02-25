-- ============================================================
-- AI Chat Feature — Supabase Migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Chat history (one row per user+character, messages as JSONB array)
create table if not exists ai_chat_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  messages     jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now(),
  unique(user_id, character_id)
);

alter table ai_chat_history enable row level security;

create policy "Users manage own AI chat history"
  on ai_chat_history for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. Character memory (persistent facts the AI remembers about the user, per character)
create table if not exists ai_character_memory (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  character_id text not null,
  memory_text  text not null default '',
  updated_at   timestamptz not null default now(),
  unique(user_id, character_id)
);

alter table ai_character_memory enable row level security;

create policy "Users manage own AI character memory"
  on ai_character_memory for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
