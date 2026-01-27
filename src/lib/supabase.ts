import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
	console.error('Missing Supabase environment variables!');
	console.error('PUBLIC_SUPABASE_URL:', PUBLIC_SUPABASE_URL);
	console.error('PUBLIC_SUPABASE_ANON_KEY:', PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
}

export const supabase = createClient(
	PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
	PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
	{
		auth: {
			persistSession: browser,
			autoRefreshToken: true
		}
	}
);

