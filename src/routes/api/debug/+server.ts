import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async () => {
	try {
		// Attempt a simple query to check connection
		await db.query('SELECT 1');
		
		return json({
			mysql_connected: true,
			service_role_exists: true, // Keep for backward compatibility with frontend check
			message: 'Connected to MySQL successfully'
		});
	} catch (error: any) {
		console.error('Debug API - MySQL Connection Error:', error);
		return json({
			mysql_connected: false,
			service_role_exists: false,
			message: error.message || 'Failed to connect to MySQL',
			code: error.code
		});
	}
};
