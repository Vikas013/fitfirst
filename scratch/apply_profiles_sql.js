const { Client } = require('pg');

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error("SUPABASE_DB_PASSWORD environment variable not set.");
  process.exit(1);
}

const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres:${encodedPassword}@db.gwtgsxgylwhklrggchuq.supabase.co:5432/postgres`;

const sql = `
-- 1. Create Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  onboarded boolean default false not null,
  date_of_birth date,
  gender text,
  unit_system text default 'metric' not null, -- 'metric' or 'imperial'
  height numeric, -- stored in cm
  weight numeric, -- stored in kg
  activity_level text, -- 'sedentary', 'light', 'moderate', 'active'
  primary_goal text, -- 'lose_weight', 'build_muscle', 'endurance', 'fitness'
  
  -- Default Daily Targets (Personalized during onboarding)
  default_steps_goal integer default 10000 not null,
  default_calories_goal integer default 600 not null,
  default_minutes_goal integer default 60 not null,
  default_water_goal integer default 8 not null,
  
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Drop existing policies if they exist to avoid duplication errors
drop policy if exists "Users can select their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Profiles Policies
create policy "Users can select their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Users can insert their own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "Users can update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Trigger to automatically create a profile record when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists to avoid error
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for any existing users
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
`;

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to Supabase. Creating profiles table, policies, and triggers...");
    await client.query(sql);
    console.log("Database schema successfully updated! Profiles table is ready.");
  } catch (err) {
    console.error("Failed to execute SQL migration:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
