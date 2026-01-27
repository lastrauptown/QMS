
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env manually since we're not using SvelteKit's $env
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- SERVICES ---');
    const { data: services } = await supabase.from('services').select('*');
    console.table(services.map(s => ({ id: s.id, code: s.code, name: s.name })));

    console.log('\n--- COUNTERS ---');
    const { data: counters } = await supabase.from('counters').select('*');
    console.table(counters.map(c => ({ id: c.id, name: c.name, service_id: c.service_id, is_active: c.is_active })));

    console.log('\n--- WAITING TICKETS ---');
    const { data: tickets } = await supabase.from('tickets').select('*').eq('status', 'waiting');
    console.table(tickets.map(t => ({ ticket: t.ticket_number, service: t.service_code, status: t.status })));
}

check();
