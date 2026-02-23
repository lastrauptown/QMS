import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = 'static/uploads';

export const GET: RequestHandler = async () => {
	try {
		// Ensure directory exists
		try {
			await fs.access(UPLOAD_DIR);
		} catch {
			await fs.mkdir(UPLOAD_DIR, { recursive: true });
		}

		const files = await fs.readdir(UPLOAD_DIR);
		
		// Map to format expected by frontend (mimicking Supabase storage list)
		const videoList = files.map(name => ({
			name,
			url: `/uploads/${name}`,
			// Add dummy metadata if needed
			metadata: {},
			created_at: new Date().toISOString()
		}));

		return json(videoList);
	} catch (error: any) {
		console.error('Error listing videos:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		
		if (!file) {
			return json({ error: 'No file uploaded' }, { status: 400 });
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const fileName = file.name;
		const filePath = path.join(UPLOAD_DIR, fileName);

		await fs.writeFile(filePath, buffer);

		return json({ 
			success: true, 
			path: fileName,
			publicUrl: `/uploads/${fileName}`
		});
	} catch (error: any) {
		console.error('Error uploading video:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
