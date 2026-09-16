-- מתקן מרוץ (race condition) ב-getActivePlan: שתי קריאות מקבילות שכל אחת בדקה "אין תוכנית עדיין"
-- ואז יצרה אחת בנפרד יכלו להשאיר שתי שורות meal_plans לאותו user_id. is_active לא משמש בפועל
-- לבחירה בין כמה תוכניות (תמיד true, אין מסך שמייצר תוכנית שנייה) — לכן תוכנית אחת בלבד לכל
-- משתמש היא ההתאמה הנכונה למודל הקיים, לא רק תיקון סימפטומטי.

-- שלב 1: לפני הוספת האילוץ, מאחדים כפילויות קיימות (אם נוצרו) בלי לאבד נתונים —
-- ארוחות מתוכננות מהתוכנית הכפולה עוברות לתוכנית הוותיקה ביותר של אותו משתמש.
with ranked as (
  select id, user_id, row_number() over (partition by user_id order by created_at asc, id asc) as rn
  from meal_plans
),
keepers as (
  select user_id, id as keep_id from ranked where rn = 1
),
duplicates as (
  select r.id as dup_id, k.keep_id
  from ranked r
  join keepers k using (user_id)
  where r.rn > 1
)
update planned_meals pm
set plan_id = d.keep_id
from duplicates d
where pm.plan_id = d.dup_id;

delete from meal_plans mp
using (
  select id, row_number() over (partition by user_id order by created_at asc, id asc) as rn
  from meal_plans
) ranked
where mp.id = ranked.id and ranked.rn > 1;

-- שלב 2: אילוץ ברמת מסד הנתונים שמונע את המרוץ מהשורש (לא רק בקוד הלקוח).
alter table meal_plans add constraint meal_plans_user_id_unique unique (user_id);
