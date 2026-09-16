-- כמו במיגרציה 0003, אך עבור service_role: בפרויקט עם "Automatically expose new tables" כבוי,
-- גם ל-service_role (המשמש בסקריפט הייבוא scripts/import-foods.mjs) אין גישה מובנית אוטומטית
-- לטבלאות חדשות. service_role עוקף RLS מטבעו, אבל עדיין צריך GRANT ברמת התפקיד כדי לגשת לטבלה בכלל.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
