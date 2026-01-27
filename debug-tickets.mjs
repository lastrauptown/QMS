
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTickets() {
    console.log('Checking tickets...');
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.table(tickets.map(t => ({
        ticket: t.ticket_number,
        status: t.status,
        counter: t.counter_id,
        created: new Date(t.created_at).toLocaleString(),
        called: t.called_at ? new Date(t.called_at).toLocaleString() : '-',
        served: t.served_at ? new Date(t.served_at).toLocaleString() : '-'
    })));

    // Check counters
    const { data: counters } = await supabase.from('counters').select('*');
    console.log('\nCounters:');
    console.table(counters.map(c => ({
        id: c.id,
        name: c.name,
        current: c.current_ticket,
        active: c.is_active
    })));
}

checkTickets();
