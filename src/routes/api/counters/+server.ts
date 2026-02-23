import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async () => {
	try {
		const [rows] = await db.query('SELECT * FROM counters ORDER BY name');
		return json({ counters: rows });
	} catch (error: any) {
		console.error('Server error fetching counters:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, service_id, is_active } = await request.json();
		
		if (!name || !service_id) {
			return json({ error: 'Name and Service are required' }, { status: 400 });
		}

		const id = uuidv4();
		await db.query(
			'INSERT INTO counters (id, name, service_id, is_active, created_at) VALUES (?, ?, ?, ?, NOW())',
			[id, name, service_id, is_active]
		);

		return json({ success: true, id });
	} catch (error: any) {
		console.error('Error creating counter:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
