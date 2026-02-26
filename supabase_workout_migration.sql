-- ============================================================
-- Workout Tracker Migration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- ── workout_sessions ─────────────────────────────────────────
create table if not exists workout_sessions (
  id          text        primary key,
  user_id     uuid        references auth.users not null,
  category    text        not null check (category in ('calisthenics', 'gym', 'other')),
  title       text        not null,
  notes       text        not null default '',
  date        date        not null,
  xp_awarded  integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table workout_sessions enable row level security;

create policy "Users manage own workout sessions"
  on workout_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_sessions_user_date
  on workout_sessions (user_id, date desc);

-- ── workout_exercises ─────────────────────────────────────────
-- Each exercise inside a session. Sets stored as JSONB array:
-- [{reps: 8, weight: 80, unit: "kg"}, ...]
create table if not exists workout_exercises (
  id            text    primary key,
  session_id    text    references workout_sessions on delete cascade not null,
  user_id       uuid    references auth.users not null,
  exercise_name text    not null,
  sets          jsonb   not null default '[]',
  order_index   integer not null default 0
);

alter table workout_exercises enable row level security;

create policy "Users manage own workout exercises"
  on workout_exercises for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists workout_exercises_session
  on workout_exercises (session_id);

create index if not exists workout_exercises_user_name
  on workout_exercises (user_id, exercise_name);

-- ── workout_baselines ─────────────────────────────────────────
-- Manual starting point per exercise. One row per (user, exercise).
create table if not exists workout_baselines (
  id            text        primary key,
  user_id       uuid        references auth.users not null,
  exercise_name text        not null,
  reps          integer,
  weight        numeric,
  unit          text        not null default 'kg',
  notes         text        not null default '',
  updated_at    timestamptz not null default now(),
  unique (user_id, exercise_name)
);

alter table workout_baselines enable row level security;

create policy "Users manage own workout baselines"
  on workout_baselines for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
