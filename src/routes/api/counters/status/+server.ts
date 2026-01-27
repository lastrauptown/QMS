import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check for service role key
		if (!SUPABASE_SERVICE_ROLE_KEY) {
			return json(
				{ error: 'Service role key not configured' },
				{ status: 500 }
			);
		}

		// Create admin client
		const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const { counterId, isActive } = await request.json();

		if (!counterId) {
			return json({ error: 'Counter ID is required' }, { status: 400 });
		}

		const { error } = await adminClient
			.from('counters')
			.update({ is_active: isActive })
			.eq('id', counterId);

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ success: true });
	} catch (error: any) {
		console.error('Error updating counter status:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
