import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { v4 as uuidv4 } from 'uuid';

export const GET: RequestHandler = async () => {
	try {
		const [rows] = await db.query('SELECT id, email, name, role, counter_id, created_at FROM users ORDER BY created_at DESC');
		return json({ users: rows });
	} catch (error: any) {
		console.error('Error fetching users:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { email, password, name, role, counter_id } = await request.json();

		if (!email || !password || !role) {
			return json({ error: 'Email, password, and role are required' }, { status: 400 });
		}

		const [existingUsers]: any = await db.query('SELECT id FROM users WHERE email = ?', [email]);
		if (existingUsers.length > 0) {
			return json({ error: 'User with this email already exists' }, { status: 400 });
		}

		const userId = uuidv4();
		await db.query(
			'INSERT INTO users (id, email, password_hash, name, role, counter_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
			[userId, email, password, name || null, role, counter_id || null]
		);

		return json({ success: true, user: { id: userId, email, name, role, counter_id } });
	} catch (error: any) {
		console.error('Error creating user:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
