import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();
		const { name, service_id, is_active } = body;

		// Handle partial updates (like just is_active from admin dashboard)
		if (Object.keys(body).length === 1 && body.is_active !== undefined) {
			await db.query(
				'UPDATE counters SET is_active = ? WHERE id = ?',
				[is_active, id]
			);
			return json({ success: true });
		}

		if (!name || !service_id) {
			return json({ error: 'Name and Service are required' }, { status: 400 });
		}

		await db.query(
			'UPDATE counters SET name = ?, service_id = ?, is_active = ? WHERE id = ?',
			[name, service_id, is_active, id]
		);

		return json({ success: true });
	} catch (error: any) {
		console.error('Error updating counter:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		await db.query('DELETE FROM counters WHERE id = ?', [id]);
		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting counter:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
