import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = 'static/uploads';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { name } = params;
		if (!name) {
			return json({ error: 'Filename is required' }, { status: 400 });
		}

		const filePath = path.join(UPLOAD_DIR, name);
		
		// Check if file exists
		try {
			await fs.access(filePath);
		} catch {
			return json({ error: 'File not found' }, { status: 404 });
		}

		await fs.unlink(filePath);

		return json({ success: true });
	} catch (error: any) {
		console.error('Error deleting video:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
