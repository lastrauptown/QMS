import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const { code, name, description, is_active } = await request.json();

		if (!code || !name) {
			return json({ error: 'Code and Name are required' }, { status: 400 });
		}

		await db.query(
			'UPDATE services SET code = ?, name = ?, description = ?, is_active = ? WHERE id = ?',
			[code, name, description, is_active, id]
		);

		return json({ success: true });
	} catch (error: any) {
		console.error('Error updating service:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		await db.query('DELETE FROM services WHERE id = ?', [id]);
		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting service:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
