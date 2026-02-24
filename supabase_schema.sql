-- ============================================================
-- Kyverion — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- XP (one row per user, categories stored as JSONB)
create table if not exists xp_data (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null unique,
  categories      jsonb default '{}'::jsonb,
  global_level    integer default 1,
  global_total_xp integer default 0,
  last_updated    timestamptz default now()
);

-- Tasks
create table if not exists tasks (
  id               text primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  title            text not null,
  description      text default '',
  due_date         text,
  priority         text default 'medium',
  categories       text[] default '{}',
  recurrence       jsonb default '{"type":"none"}'::jsonb,
  completed        boolean default false,
  completed_at     timestamptz,
  completed_dates  text[] default '{}',
  xp_awarded       boolean default false,
  xp_awarded_dates text[] default '{}',
  created_at       timestamptz default now()
);

-- Habits
create table if not exists habits (
  id             text primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  name           text not null,
  description    text default '',
  category       text,
  frequency      text default 'daily',
  longest_streak integer default 0,
  active         boolean default true,
  created_at     timestamptz default now()
);

-- Habit completions (one row per habit per day completed)
create table if not exists habit_completions (
  id           uuid default gen_random_uuid() primary key,
  habit_id     text references habits(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  date         text not null,
  completed_at timestamptz default now(),
  unique(habit_id, date)
);

-- Appointments
create table if not exists appointments (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  description text default '',
  date        text not null,
  time        text default '',
  end_time    text default '',
  location    text default '',
  color       text default '#00d4ff',
  created_at  timestamptz default now()
);

-- No-Smoke tracker (one row per user)
create table if not exists nosmoke (
  id                 uuid default gen_random_uuid() primary key,
  user_id            uuid references auth.users(id) on delete cascade not null unique,
  settings           jsonb default '{}'::jsonb,
  log                jsonb default '[]'::jsonb,
  record             integer default 0,
  start_time         bigint,
  milestones_awarded jsonb default '[]'::jsonb,
  updated_at         timestamptz default now()
);

-- Finance transactions
create table if not exists finance_transactions (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  type        text not null,
  amount      decimal(10,2) not null,
  category    text,
  description text default '',
  date        text not null,
  month       text not null,
  created_at  timestamptz default now()
);

-- Finance settings (one row per user)
create table if not exists finance_settings (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  budget_method text default '50-30-20',
  custom_split  jsonb default '{"needs":50,"wants":30,"savings":20}'::jsonb,
  currency      text default '€',
  xp_awarded    jsonb default '{}'::jsonb,
  updated_at    timestamptz default now()
);

-- Learning areas
create table if not exists learning_areas (
  id            text primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  icon          text default '📚',
  color         text default '#00d4ff',
  category      text default 'intelligence',
  total_seconds integer default 0,
  created_at    timestamptz default now()
);

-- Learning notes
create table if not exists learning_notes (
  id         text primary key,
  area_id    text references learning_areas(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  title      text default 'Untitled',
  content    text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Learning links
create table if not exists learning_links (
  id       text primary key,
  area_id  text references learning_areas(id) on delete cascade not null,
  user_id  uuid references auth.users(id) on delete cascade not null,
  title    text,
  url      text not null,
  added_at timestamptz default now()
);

-- Learning sessions
create table if not exists learning_sessions (
  id               text primary key,
  area_id          text references learning_areas(id) on delete cascade not null,
  user_id          uuid references auth.users(id) on delete cascade not null,
  started_at       timestamptz,
  ended_at         timestamptz,
  duration_seconds integer not null,
  xp_awarded       integer default 0,
  date             text not null,
  created_at       timestamptz default now()
);

-- ============================================================
-- Row Level Security — users can only access their own data
-- ============================================================

alter table xp_data              enable row level security;
alter table tasks                enable row level security;
alter table habits               enable row level security;
alter table habit_completions    enable row level security;
alter table appointments         enable row level security;
alter table nosmoke              enable row level security;
alter table finance_transactions enable row level security;
alter table finance_settings     enable row level security;
alter table learning_areas       enable row level security;
alter table learning_notes       enable row level security;
alter table learning_links       enable row level security;
alter table learning_sessions    enable row level security;

create policy "own xp_data"              on xp_data              for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks"                on tasks                for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habits"               on habits               for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own habit_completions"    on habit_completions    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own appointments"         on appointments         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own nosmoke"              on nosmoke              for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own finance_transactions" on finance_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own finance_settings"     on finance_settings     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own learning_areas"       on learning_areas       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own learning_notes"       on learning_notes       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own learning_links"       on learning_links       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own learning_sessions"    on learning_sessions    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
