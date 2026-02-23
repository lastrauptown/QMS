import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async () => {
	try {
		// Delete all tickets except potentially a placeholder with id 0 (if any)
		// Note: If IDs are UUIDs, this condition is harmless but preserves original logic intent
		await db.query("DELETE FROM tickets WHERE id != '0'");
		
		return json({ success: true });
	} catch (error: any) {
		console.error('Error resetting tickets:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
