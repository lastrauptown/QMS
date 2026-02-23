import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const userId = url.searchParams.get('id');

		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		const [users]: any = await db.query(
			'SELECT id, email, role, counter_id, name FROM users WHERE id = ?',
			[userId]
		);

		if (users.length === 0) {
			return json({ error: 'User not found' }, { status: 404 });
		}

		return json(users[0]);
	} catch (error: any) {
		console.error('Error fetching profile:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
