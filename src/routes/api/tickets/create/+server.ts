import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { v4 as uuidv4 } from 'uuid';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { serviceCode } = await request.json();

		if (!serviceCode) {
			return json({ error: 'Service code is required' }, { status: 400 });
		}

		// 1. Verify service exists
		const [services]: any = await db.query(
			'SELECT id, is_active FROM services WHERE code = ? LIMIT 1',
			[serviceCode]
		);

		if (services.length === 0) {
			return json({ error: 'Service not found' }, { status: 404 });
		}

		if (!services[0].is_active) {
			return json({ error: 'This service is currently unavailable' }, { status: 400 });
		}

		// 2. Get last ticket for today
		const today = new Date().toISOString().split('T')[0];
		const [lastTickets]: any = await db.query(
			'SELECT ticket_number FROM tickets WHERE service_code = ? AND DATE(created_at) = ? ORDER BY created_at DESC LIMIT 1',
			[serviceCode, today]
		);
		
		let nextNumber = 1;
		if (lastTickets.length > 0) {
			// Extract number from format "CODE-001"
			const parts = lastTickets[0].ticket_number.split('-');
			if (parts.length > 1) {
				nextNumber = parseInt(parts[1], 10) + 1;
			}
		}

		const ticketNumber = `${serviceCode}-${String(nextNumber).padStart(3, '0')}`;
		const ticketId = uuidv4();

		// 4. Create ticket
		await db.query(
			'INSERT INTO tickets (id, ticket_number, service_code, status, created_at) VALUES (?, ?, ?, ?, NOW())',
			[ticketId, ticketNumber, serviceCode, 'waiting']
		);

		const ticket = {
			id: ticketId,
			ticket_number: ticketNumber,
			service_code: serviceCode,
			status: 'waiting',
			created_at: new Date()
		};

		return json({ ticket });
	} catch (error: any) {
		console.error('Error creating ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
