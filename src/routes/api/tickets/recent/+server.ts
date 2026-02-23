import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		const [rows] = await db.query('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 100');
		return json({ tickets: rows });
	} catch (error: any) {
		console.error('Server error fetching tickets:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
