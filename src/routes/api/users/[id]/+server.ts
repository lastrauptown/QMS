import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const { email, name, role, counter_id, password } = await request.json();

		if (!email || !role) {
			return json({ error: 'Email and role are required' }, { status: 400 });
		}

		let query = 'UPDATE users SET email = ?, name = ?, role = ?, counter_id = ?';
		let queryParams = [email, name || null, role, counter_id || null];

		if (password) {
		query += ', password_hash = ?';
			queryParams.push(password);
		}

		query += ' WHERE id = ?';
		queryParams.push(id);

		await db.query(query, queryParams);

		return json({ success: true });
	} catch (error: any) {
		console.error('Error updating user:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		await db.query('DELETE FROM users WHERE id = ?', [id]);
		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting user:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
