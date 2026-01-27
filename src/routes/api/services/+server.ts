import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const GET: RequestHandler = async () => {
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

		const { data, error } = await adminClient
			.from('services')
			.select('*')
			.order('code');

		if (error) {
			console.error('Error fetching services via admin:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json({ services: data });
	} catch (error: any) {
		console.error('Server error fetching services:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
