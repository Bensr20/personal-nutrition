-- התזונה שלי — סכימת בסיס נתונים ראשונית
-- כולל: טבלאות ליבה, אילוצים, טריגר עדכון updated_at, RLS מלא לכל טבלה,
-- ו-bucket פרטי לתמונות ארוחות עם מדיניות גישה לפי בעלים בלבד.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- פונקציית עזר: עדכון אוטומטי של updated_at
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  goal_text text,
  eating_preferences text,
  disliked_foods text,
  allergies text,
  starting_weight_kg numeric check (starting_weight_kg is null or starting_weight_kg > 0),
  water_goal_ml integer check (water_goal_ml is null or water_goal_ml > 0),
  activity_goal_minutes integer check (activity_goal_minutes is null or activity_goal_minutes > 0),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on profiles for delete using (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- meal_plans
-- ---------------------------------------------------------------------------
create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'התוכנית שלי',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_plans_user_id_idx on meal_plans(user_id);

alter table meal_plans enable row level security;

create policy "meal_plans_select_own" on meal_plans for select using (auth.uid() = user_id);
create policy "meal_plans_insert_own" on meal_plans for insert with check (auth.uid() = user_id);
create policy "meal_plans_update_own" on meal_plans for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meal_plans_delete_own" on meal_plans for delete using (auth.uid() = user_id);

create trigger meal_plans_set_updated_at
  before update on meal_plans
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- planned_meals — תכנון שבועי (יום בשבוע + סוג ארוחה)
-- ---------------------------------------------------------------------------
create table planned_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references meal_plans(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null check (char_length(trim(name)) > 0),
  items jsonb not null default '[]'::jsonb,
  note text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index planned_meals_plan_day_idx on planned_meals(plan_id, day_of_week);
create index planned_meals_user_id_idx on planned_meals(user_id);

alter table planned_meals enable row level security;

create policy "planned_meals_select_own" on planned_meals for select using (auth.uid() = user_id);
create policy "planned_meals_insert_own" on planned_meals for insert with check (auth.uid() = user_id);
create policy "planned_meals_update_own" on planned_meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "planned_meals_delete_own" on planned_meals for delete using (auth.uid() = user_id);

create trigger planned_meals_set_updated_at
  before update on planned_meals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- meals — יומן ארוחות בפועל
-- ---------------------------------------------------------------------------
create table meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null,
  meal_time time,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  note text,
  photo_path text,
  source_planned_meal_id uuid references planned_meals(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meals_user_date_idx on meals(user_id, meal_date);

-- מניעת רשומת יומן כפולה מאותה ארוחה מתוכננת באותו תאריך (מניעת כפילות בלחיצה חוזרת על "אכלתי")
create unique index meals_unique_source_per_date
  on meals(user_id, meal_date, source_planned_meal_id)
  where source_planned_meal_id is not null;

alter table meals enable row level security;

create policy "meals_select_own" on meals for select using (auth.uid() = user_id);
create policy "meals_insert_own" on meals for insert with check (auth.uid() = user_id);
create policy "meals_update_own" on meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "meals_delete_own" on meals for delete using (auth.uid() = user_id);

create trigger meals_set_updated_at
  before update on meals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- meal_items — פריטי מזון בתוך רשומת יומן
-- ---------------------------------------------------------------------------
create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references meals(id) on delete cascade,
  food_name text not null check (char_length(trim(food_name)) > 0),
  quantity numeric not null check (quantity > 0),
  unit text not null check (char_length(trim(unit)) > 0),
  position integer not null default 0
);

create index meal_items_meal_id_idx on meal_items(meal_id);

alter table meal_items enable row level security;

create policy "meal_items_select_own" on meal_items for select using (
  exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid())
);
create policy "meal_items_insert_own" on meal_items for insert with check (
  exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid())
);
create policy "meal_items_update_own" on meal_items for update using (
  exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid())
) with check (
  exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid())
);
create policy "meal_items_delete_own" on meal_items for delete using (
  exists (select 1 from meals where meals.id = meal_items.meal_id and meals.user_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- water_logs
-- ---------------------------------------------------------------------------
create table water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  amount_ml integer not null check (amount_ml > 0),
  logged_at timestamptz not null default now()
);

create index water_logs_user_date_idx on water_logs(user_id, log_date);

alter table water_logs enable row level security;

create policy "water_logs_select_own" on water_logs for select using (auth.uid() = user_id);
create policy "water_logs_insert_own" on water_logs for insert with check (auth.uid() = user_id);
create policy "water_logs_update_own" on water_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "water_logs_delete_own" on water_logs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- activity_logs
-- ---------------------------------------------------------------------------
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  activity_type text not null check (char_length(trim(activity_type)) > 0),
  duration_minutes integer not null check (duration_minutes > 0),
  note text,
  logged_at timestamptz not null default now()
);

create index activity_logs_user_date_idx on activity_logs(user_id, log_date);

alter table activity_logs enable row level security;

create policy "activity_logs_select_own" on activity_logs for select using (auth.uid() = user_id);
create policy "activity_logs_insert_own" on activity_logs for insert with check (auth.uid() = user_id);
create policy "activity_logs_update_own" on activity_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_logs_delete_own" on activity_logs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weight_logs — מדידה אחת ליום (upsert לפי תאריך, מונע כפילויות)
-- ---------------------------------------------------------------------------
create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  weight_kg numeric not null check (weight_kg > 0),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index weight_logs_user_date_idx on weight_logs(user_id, log_date);

alter table weight_logs enable row level security;

create policy "weight_logs_select_own" on weight_logs for select using (auth.uid() = user_id);
create policy "weight_logs_insert_own" on weight_logs for insert with check (auth.uid() = user_id);
create policy "weight_logs_update_own" on weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weight_logs_delete_own" on weight_logs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- favorite_meals
-- ---------------------------------------------------------------------------
create table favorite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  meal_type text check (meal_type is null or meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  items jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index favorite_meals_user_id_idx on favorite_meals(user_id);

alter table favorite_meals enable row level security;

create policy "favorite_meals_select_own" on favorite_meals for select using (auth.uid() = user_id);
create policy "favorite_meals_insert_own" on favorite_meals for insert with check (auth.uid() = user_id);
create policy "favorite_meals_update_own" on favorite_meals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorite_meals_delete_own" on favorite_meals for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: bucket פרטי לתמונות ארוחות
-- מבנה נתיב: <user_id>/<file-name>  — כך שאפשר לאכוף בעלות לפי התיקייה הראשונה בנתיב
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "meal_photos_select_own" on storage.objects for select using (
  bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "meal_photos_insert_own" on storage.objects for insert with check (
  bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "meal_photos_update_own" on storage.objects for update using (
  bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "meal_photos_delete_own" on storage.objects for delete using (
  bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text
);
