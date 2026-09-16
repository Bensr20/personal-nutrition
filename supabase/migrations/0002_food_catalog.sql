-- הטמעת חיפוש מזון: קטלוג ציבורי (מאגר תזונה לאומי + Open Food Facts), מוצרים פרטיים למשתמש,
-- ותמונת מצב תזונתית (snapshot) לכל פריט ביומן/בתכנון — ראה README לרישוי/ייחוס.

-- ---------------------------------------------------------------------------
-- foods — קטלוג ציבורי לקריאה בלבד מהלקוח. נכתב ע"י scripts/import-foods.mjs
-- באמצעות service role key (מחוץ ללקוח) — RLS מונע כתיבה/עדכון/מחיקה מהאפליקציה.
-- ---------------------------------------------------------------------------
create table foods (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('israeli_db', 'off')),
  source_id text not null,
  original_name text not null,
  display_name_he text not null,
  english_name text,
  brand text,
  barcode text,
  kcal_per_100 numeric,
  protein_g_per_100 numeric,
  carbs_g_per_100 numeric,
  fat_g_per_100 numeric,
  base_unit text not null default 'g' check (base_unit in ('g', 'ml')),
  fetched_at timestamptz not null default now(),
  source_updated_at date,
  verified boolean not null default true,
  unique (source, source_id)
);

create index foods_display_name_idx on foods using gin (to_tsvector('simple', display_name_he));
create index foods_barcode_idx on foods(barcode) where barcode is not null;

alter table foods enable row level security;

-- קריאה בלבד לכל משתמש מחובר; אין insert/update/delete policy בכוונה — כתיבה רק דרך service role.
create policy "foods_select_authenticated" on foods for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- food_units — מידות ביתיות ומשקלן בגרם, פר מזון (מהמאגר הלאומי בעיקר)
-- ---------------------------------------------------------------------------
create table food_units (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references foods(id) on delete cascade,
  unit_code text not null,
  label_he text not null,
  grams numeric not null check (grams > 0)
);

create index food_units_food_id_idx on food_units(food_id);

alter table food_units enable row level security;

create policy "food_units_select_authenticated" on food_units for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- user_foods — מוצרים פרטיים שהמשתמש השלים ידנית מהתווית (לא חלק מהקטלוג הציבורי)
-- ---------------------------------------------------------------------------
create table user_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  brand text,
  barcode text,
  kcal_per_100 numeric,
  protein_g_per_100 numeric,
  carbs_g_per_100 numeric,
  fat_g_per_100 numeric,
  created_at timestamptz not null default now()
);

create index user_foods_user_id_idx on user_foods(user_id);

alter table user_foods enable row level security;

create policy "user_foods_select_own" on user_foods for select using (auth.uid() = user_id);
create policy "user_foods_insert_own" on user_foods for insert with check (auth.uid() = user_id);
create policy "user_foods_update_own" on user_foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_foods_delete_own" on user_foods for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- meal_items — הוספת תמונת מצב תזונתית (snapshot) בזמן ההוספה לארוחה.
-- רענון הקטלוג בעתיד לא ישנה ערכים אלה — הם נשמרים כפי שנקבעו ברגע השמירה.
-- ---------------------------------------------------------------------------
alter table meal_items
  add column food_source text check (food_source in ('israeli_db', 'off', 'user')),
  add column food_source_id text,
  add column food_brand text,
  add column food_barcode text,
  add column unit_code text,
  add column amount_grams numeric check (amount_grams is null or amount_grams > 0),
  add column kcal numeric,
  add column protein_g numeric,
  add column carbs_g numeric,
  add column fat_g numeric,
  add column is_partial boolean not null default false;

-- ---------------------------------------------------------------------------
-- planned_meals / favorite_meals כבר מאחסנים items כ-jsonb גנרי — תמונת המצב
-- התזונתית (foodRef/unitCode/amountGrams/nutrition) נכנסת לתוך אותו jsonb בלי מיגרציה.
-- ---------------------------------------------------------------------------
