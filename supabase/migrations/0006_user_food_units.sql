-- "היחידה שלי" — שמירה פרטית חד-פעמית של משקל יחידה ביתית עבור מוצר ספציפי (למשל "הקערה שלי
-- לקורנפלקס = 40 גרם"). לא ניחוש של האפליקציה — המשתמש קובע ושומר בעצמו, וזה חל רק על אותו
-- מוצר מדויק (source+source_id), לא על כל מוצרי הקטגוריה. תואם את העיקרון הקיים: אין המצאת
-- משקלים ("אל תניח שכף תמיד שווה X גרם").
create table user_food_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_source text not null check (food_source in ('israeli_db', 'off', 'user')),
  food_source_id text not null,
  label text not null check (char_length(trim(label)) > 0),
  grams numeric not null check (grams > 0),
  created_at timestamptz not null default now(),
  unique (user_id, food_source, food_source_id, label)
);

create index user_food_units_lookup_idx on user_food_units(user_id, food_source, food_source_id);

alter table user_food_units enable row level security;

create policy "user_food_units_select_own" on user_food_units for select using (auth.uid() = user_id);
create policy "user_food_units_insert_own" on user_food_units for insert with check (auth.uid() = user_id);
create policy "user_food_units_update_own" on user_food_units for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_food_units_delete_own" on user_food_units for delete using (auth.uid() = user_id);

-- באותה רוח כמו מיגרציה 0003: בפרויקט עם "Automatically expose new tables" כבוי, הרשאת GRANT
-- ברמת התפקיד לא ניתנת אוטומטית לטבלה חדשה גם עם RLS מוגדר נכון.
grant select, insert, update, delete on user_food_units to anon, authenticated;
grant all privileges on user_food_units to service_role;
