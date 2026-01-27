import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// This endpoint creates both the auth user and the profile
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Check for service role key
		if (!SUPABASE_SERVICE_ROLE_KEY) {
			return json(
				{ error: 'Service role key not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env file.' },
				{ status: 500 }
			);
		}

		// Create admin client with service role key (bypasses RLS)
		const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const { email, password, name, role, counter_id } = await request.json();

		// Validate required fields
		if (!email || !password || !role) {
			return json({ error: 'Email, password, and role are required' }, { status: 400 });
		}

		// Validate role
		if (role !== 'admin' && role !== 'counter_staff') {
			return json({ error: 'Role must be either "admin" or "counter_staff"' }, { status: 400 });
		}

		// Create auth user
		const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
			email,
			password,
			email_confirm: true, // Auto-confirm email
			user_metadata: {
				name: name || null
			}
		});

		if (authError) {
			console.error('Auth error:', authError);
			if (authError.message.includes('already registered') || authError.status === 422) {
				return json({ error: 'User with this email already exists' }, { status: 400 });
			}
			return json({ error: authError.message || 'Failed to create user' }, { status: 500 });
		}

		if (!authData.user) {
			return json({ error: 'Failed to create user' }, { status: 500 });
		}

		const userId = authData.user.id;

		// Create user profile
		const { error: profileError } = await adminClient
			.from('user_profiles')
			.insert({
				id: userId,
				email,
				name: name || null,
				role,
				counter_id: counter_id || null
			});

		if (profileError) {
			// If profile creation fails, try to delete the auth user
			await adminClient.auth.admin.deleteUser(userId);
			return json({ error: `Failed to create profile: ${profileError.message}` }, { status: 500 });
		}

		return json({
			success: true,
			user: {
				id: userId,
				email,
				name,
				role,
				counter_id
			}
		});
	} catch (error: any) {
		console.error('Error creating user:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

