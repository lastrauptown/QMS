import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const key = url.searchParams.get('key');
		if (!key) {
			return json({ error: 'Key parameter is required' }, { status: 400 });
		}

		const [rows]: any = await db.query('SELECT value FROM app_settings WHERE `key` = ?', [key]);
		
		if (rows.length === 0) {
			return json({ value: null });
		}

		return json(rows[0]);
	} catch (error: any) {
		console.error('Error fetching settings:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { key, value } = await request.json();
		
		if (!key) {
			return json({ error: 'Key is required' }, { status: 400 });
		}

		// MySQL UPSERT equivalent
		await db.query(
			'INSERT INTO app_settings (`key`, value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE value = ?, updated_at = NOW()',
			[key, value, value]
		);

		return json({ success: true });
	} catch (error: any) {
		console.error('Error saving settings:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
