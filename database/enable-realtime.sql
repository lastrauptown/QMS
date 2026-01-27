-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE counters;

-- Ensure RLS allows public read access for tickets (Display Page)
DROP POLICY IF EXISTS "Allow public read access to tickets" ON tickets;
CREATE POLICY "Allow public read access to tickets" ON tickets
    FOR SELECT USING (true);

-- Ensure RLS allows public read access for counters
DROP POLICY IF EXISTS "Allow public read access to counters" ON counters;
CREATE POLICY "Allow public read access to counters" ON counters
    FOR SELECT USING (true);
