-- Allow public read access to counters
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."counters"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

-- Also ensure services are readable
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."services"
AS PERMISSIVE FOR SELECT
TO public
USING (true);
