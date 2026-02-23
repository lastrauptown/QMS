import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { counterId, isActive } = await request.json();

		if (!counterId) {
			return json({ error: 'Counter ID is required' }, { status: 400 });
		}

		await db.query(
			'UPDATE counters SET is_active = ? WHERE id = ?',
			[isActive, counterId]
		);

		return json({ success: true });
	} catch (error: any) {
		console.error('Error updating counter status:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
