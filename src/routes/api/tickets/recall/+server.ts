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

		// 1. Verify ticket exists and is currently called
		const { data: ticket, error: fetchError } = await adminClient
			.from('tickets')
			.select('*')
			.eq('id', ticketId)
			.single();

		if (fetchError || !ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		if (ticket.status !== 'called') {
			return json({ error: 'Ticket is not currently called' }, { status: 400 });
		}

		// 2. Update updated_at to trigger realtime event for the display
		const { data: updatedTicket, error: updateError } = await adminClient
			.from('tickets')
			.update({ 
				updated_at: new Date().toISOString()
			})
			.eq('id', ticketId)
			.select()
			.single();

		if (updateError) {
			// If updated_at column doesn't exist or other error, fallback to updating called_at
			console.warn('Could not update updated_at, falling back to called_at', updateError);
			const { data: retryTicket, error: retryError } = await adminClient
				.from('tickets')
				.update({ 
					called_at: new Date().toISOString() 
				})
				.eq('id', ticketId)
				.select()
				.single();
				
			if (retryError) throw retryError;
			return json({ success: true, ticket: retryTicket });
		}
		
		return json({ success: true, ticket: updatedTicket });
	} catch (error: any) {
		console.error('Error recalling ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
