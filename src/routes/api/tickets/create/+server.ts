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

		const { serviceCode } = await request.json();

		if (!serviceCode) {
			return json({ error: 'Service code is required' }, { status: 400 });
		}

		// 1. Verify service exists
		const { data: service, error: serviceError } = await adminClient
			.from('services')
			.select('id, is_active')
			.eq('code', serviceCode)
			.single();

		if (serviceError || !service) {
			return json({ error: 'Service not found' }, { status: 404 });
		}

		if (!service.is_active) {
			return json({ error: 'This service is currently unavailable' }, { status: 400 });
		}

		// 2. Get last ticket for today
		const today = new Date().toISOString().split('T')[0];
		const { data: lastTicket } = await adminClient
			.from('tickets')
			.select('number')
			.eq('service_code', serviceCode)
			.gte('created_at', today)
			.order('number', { ascending: false })
			.limit(1)
			.single();

		// 3. Calculate next number
		const nextNumber = lastTicket ? lastTicket.number + 1 : 1;
		const ticketNumber = `${serviceCode}-${String(nextNumber).padStart(3, '0')}`;

		// 4. Create ticket
		const { data: ticket, error: insertError } = await adminClient
			.from('tickets')
			.insert({
				service_code: serviceCode,
				number: nextNumber,
				ticket_number: ticketNumber,
				status: 'waiting'
			})
			.select()
			.single();

		if (insertError) {
			console.error('Insert error:', insertError);
			return json({ error: 'Failed to create ticket' }, { status: 500 });
		}

		return json({ ticket });
	} catch (error: any) {
		console.error('Error creating ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
