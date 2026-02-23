import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { ticketId } = await request.json();

		if (!ticketId) {
			return json({ error: 'Ticket ID is required' }, { status: 400 });
		}

		// 1. Verify ticket exists and is currently called
		const [tickets]: any = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
		const ticket = tickets[0];

		if (!ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		if (ticket.status !== 'called') {
			return json({ error: 'Ticket is not currently called' }, { status: 400 });
		}

		// 2. Update updated_at to trigger polling update
		const now = new Date();
		await db.query(
			'UPDATE tickets SET updated_at = ? WHERE id = ?',
			[now, ticketId]
		);

		// Return updated ticket
		const [updatedTickets]: any = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
		
		return json({ success: true, ticket: updatedTickets[0] });
	} catch (error: any) {
		console.error('Error recalling ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
