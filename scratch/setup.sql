-- 1. Create Workouts Table
create table if not exists public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade default (auth.uid()),
  activity_type text not null, -- 'running', 'strength', 'cycling', 'yoga', 'walking', 'other'
  duration integer not null, -- in minutes
  calories_burned integer not null, -- in kcal
  notes text,
  logged_at timestamptz default now() not null
);

-- Enable RLS on Workouts
alter table public.workouts enable row level security;

-- Drop existing policies if they exist to avoid duplicate errors
drop policy if exists "Users can select their own workouts" on public.workouts;
drop policy if exists "Users can insert their own workouts" on public.workouts;
drop policy if exists "Users can update their own workouts" on public.workouts;
drop policy if exists "Users can delete their own workouts" on public.workouts;

-- Workouts Policies (Authenticated Users Only)
create policy "Users can select their own workouts" on public.workouts
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can insert their own workouts" on public.workouts
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can update their own workouts" on public.workouts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users can delete their own workouts" on public.workouts
  for delete to authenticated using ((select auth.uid()) = user_id);


-- 2. Create Daily Metrics Table
create table if not exists public.daily_metrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade default (auth.uid()),
  date date default current_date not null,
  steps integer default 0 not null,
  steps_goal integer default 10000 not null,
  calories_goal integer default 600 not null,
  active_minutes integer default 0 not null,
  active_minutes_goal integer default 60 not null,
  water_intake integer default 0 not null, -- in cups
  water_goal integer default 8 not null -- in cups
);

-- Add unique constraint to support UPSERT operations per user/date if it does not exist
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'daily_metrics_user_id_date_key') then
    alter table public.daily_metrics add constraint daily_metrics_user_id_date_key unique (user_id, date);
  end if;
end;
$$;

-- Enable RLS on Daily Metrics
alter table public.daily_metrics enable row level security;

-- Drop existing policies if they exist to avoid duplicate errors
drop policy if exists "Users can select their own metrics" on public.daily_metrics;
drop policy if exists "Users can insert their own metrics" on public.daily_metrics;
drop policy if exists "Users can update their own metrics" on public.daily_metrics;
drop policy if exists "Users can delete their own metrics" on public.daily_metrics;

-- Daily Metrics Policies (Authenticated Users Only)
create policy "Users can select their own metrics" on public.daily_metrics
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can insert their own metrics" on public.daily_metrics
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can update their own metrics" on public.daily_metrics
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users can delete their own metrics" on public.daily_metrics
  for delete to authenticated using ((select auth.uid()) = user_id);
