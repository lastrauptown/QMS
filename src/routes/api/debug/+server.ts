import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export const GET: RequestHandler = async () => {
	return json({
		public_url_exists: !!PUBLIC_SUPABASE_URL,
		public_anon_exists: !!PUBLIC_SUPABASE_ANON_KEY,
		service_role_exists: !!SUPABASE_SERVICE_ROLE_KEY,
		public_url_prefix: PUBLIC_SUPABASE_URL?.substring(0, 10),
        service_role_prefix: SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10)
	});
};
