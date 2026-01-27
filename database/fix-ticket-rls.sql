-- Allow public read access to tickets so Display page and Counter staff can see them
CREATE POLICY "Allow public read access to tickets" ON tickets
    FOR SELECT USING (true);

-- Allow counter staff to update any ticket (to call/serve/transfer)
-- The previous policy restricted updates to tickets already assigned to their counter
-- But they need to update 'waiting' tickets to assign them to their counter
DROP POLICY IF EXISTS "Counter staff can update tickets" ON tickets;

CREATE POLICY "Counter staff can update tickets" ON tickets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'counter_staff'))
);
