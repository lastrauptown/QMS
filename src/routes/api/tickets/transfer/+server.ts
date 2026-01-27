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

		const { ticketId, newCounterId } = await request.json();

		if (!ticketId || !newCounterId) {
			return json({ error: 'Ticket ID and New Counter ID are required' }, { status: 400 });
		}

		// 1. Get current ticket to verify logic and get current counter
		const { data: ticket, error: fetchError } = await adminClient
			.from('tickets')
			.select('counter_id')
			.eq('id', ticketId)
			.single();

		if (fetchError || !ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		// 2. Get target counter to get service code
		const { data: targetCounter, error: counterError } = await adminClient
			.from('counters')
			.select('service_id')
			.eq('id', newCounterId)
			.single();

		if (counterError || !targetCounter) {
			return json({ error: 'Target counter not found' }, { status: 404 });
		}

		// 3. Get target service to get code
		const { data: targetService, error: serviceError } = await adminClient
			.from('services')
			.select('code')
			.eq('id', targetCounter.service_id)
			.single();
			
		if (serviceError || !targetService) {
			return json({ error: 'Target service not found' }, { status: 404 });
		}

		// 4. Update ticket: set to waiting, assign to new counter, update service code
		const { data: updatedTicket, error: updateError } = await adminClient
			.from('tickets')
			.update({
				status: 'waiting',
				counter_id: newCounterId,
				service_code: targetService.code,
				called_at: null // Reset called_at so it looks new
			})
			.eq('id', ticketId)
			.select()
			.single();

		if (updateError) {
			console.error('Transfer ticket error:', updateError);
			return json({ error: 'Failed to transfer ticket' }, { status: 500 });
		}

		// 5. Clear current counter's display
		if (ticket.counter_id) {
			await adminClient
				.from('counters')
				.update({ current_ticket: null })
				.eq('id', ticket.counter_id);
		}

		return json({ ticket: updatedTicket });
	} catch (error: any) {
		console.error('Error transferring ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
