-- הענקת הרשאות בסיס ברמת תפקיד (GRANT) לתפקידי ה-Data API (anon, authenticated) על כל הטבלאות
-- בסכימת public. זהו שלב נפרד מ-RLS: GRANT הוא "האם לתפקיד יש גישה לטבלה בכלל", ו-RLS הוא
-- "אילו שורות ספציפיות הוא רואה/יכול לשנות". בפרויקט עם "Automatically expose new tables" כבוי
-- (מומלץ מסיבות אבטחה) שני השלבים האלה לא קורים אוטומטית — לכן הם מבוצעים כאן במפורש.
--
-- זה בטוח: על כל טבלה יש RLS מופעל (enable row level security) מהמיגרציות הקודמות, כך שגם
-- לאחר ה-GRANT הרחב כאן, כל שורה עדיין עוברת דרך ה-policies שכבר הוגדרו (או נדחית כברירת מחדל
-- אם אין policy תואם, כמו INSERT/UPDATE/DELETE על foods/food_units).

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
