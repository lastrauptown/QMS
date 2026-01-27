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

		const { ticketId, counterId } = await request.json();

		if (!ticketId || !counterId) {
			return json({ error: 'Ticket ID and Counter ID are required' }, { status: 400 });
		}

		// 1. Auto-complete any currently serving ticket for this counter
		// This ensures we don't leave "zombie" tickets if the user forgets to click Complete
		await adminClient
			.from('tickets')
			.update({
				status: 'served',
				served_at: new Date().toISOString()
			})
			.eq('counter_id', counterId)
			.eq('status', 'called');

		// 2. Update new ticket status to 'called'
		const { data: updatedTicket, error: updateError } = await adminClient
			.from('tickets')
			.update({
				status: 'called',
				counter_id: counterId,
				called_at: new Date().toISOString()
			})
			.eq('id', ticketId)
			.select()
			.single();

		if (updateError) {
			console.error('Call ticket error:', updateError);
			return json({ error: 'Failed to call ticket' }, { status: 500 });
		}

		// 3. Update counter display
		await adminClient
			.from('counters')
			.update({ current_ticket: updatedTicket.ticket_number })
			.eq('id', counterId);

		return json({ ticket: updatedTicket });
	} catch (error: any) {
		console.error('Error calling ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
