import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async () => {
	try {
		const [rows] = await db.query('SELECT * FROM services ORDER BY code');
		return json({ services: rows });
	} catch (error: any) {
		console.error('Server error fetching services:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, name, description, is_active } = await request.json();
		
		if (!code || !name) {
			return json({ error: 'Code and Name are required' }, { status: 400 });
		}

		// Check if code exists
		const [existing]: any = await db.query('SELECT id FROM services WHERE code = ?', [code]);
		if (existing.length > 0) {
			return json({ error: 'Service code already exists' }, { status: 400 });
		}

		const id = uuidv4();
		await db.query(
			'INSERT INTO services (id, code, name, description, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
			[id, code, name, description, is_active]
		);

		return json({ success: true, id });
	} catch (error: any) {
		console.error('Error creating service:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
