import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!SUPABASE_SERVICE_ROLE_KEY) {
			return json({ error: 'Service role key not configured' }, { status: 500 });
		}

		const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const { ticketId } = await request.json();

		if (!ticketId) {
			return json({ error: 'Ticket ID is required' }, { status: 400 });
		}

		// 1. Get ticket to find counter
		const { data: ticket, error: fetchError } = await adminClient
			.from('tickets')
			.select('counter_id')
			.eq('id', ticketId)
			.single();

		if (fetchError || !ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		// 2. Update ticket status
		const { data: updatedTicket, error: updateError } = await adminClient
			.from('tickets')
			.update({
				status: 'skipped'
			})
			.eq('id', ticketId)
			.select()
			.single();

		if (updateError) {
			console.error('Update error:', updateError);
			return json({ error: 'Failed to skip ticket' }, { status: 500 });
		}

		// 3. Clear counter current ticket
		if (ticket.counter_id) {
			await adminClient
				.from('counters')
				.update({ current_ticket: null })
				.eq('id', ticket.counter_id);
		}

		return json({ ticket: updatedTicket });
	} catch (error: any) {
		console.error('Error skipping ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
