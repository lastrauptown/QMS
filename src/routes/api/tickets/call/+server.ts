import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { ticketId, counterId } = await request.json();

		if (!ticketId || !counterId) {
			return json({ error: 'Ticket ID and Counter ID are required' }, { status: 400 });
		}

		// 1. Auto-complete any currently serving ticket for this counter
		await db.query(
			'UPDATE tickets SET status = ?, served_at = NOW() WHERE counter_id = ? AND status = ?',
			['served', counterId, 'called']
		);

		// 2. Update new ticket status to 'called'
		const now = new Date();
		await db.query(
			'UPDATE tickets SET status = ?, counter_id = ?, called_at = ? WHERE id = ?',
			['called', counterId, now, ticketId]
		);

		// Fetch updated ticket
		const [tickets]: any = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
		const updatedTicket = tickets[0];

		if (!updatedTicket) {
			return json({ error: 'Failed to call ticket' }, { status: 500 });
		}

		// 3. Update counter display
		await db.query(
			'UPDATE counters SET current_ticket = ? WHERE id = ?',
			[updatedTicket.ticket_number, counterId]
		);

		return json({ ticket: updatedTicket });
	} catch (error: any) {
		console.error('Error calling ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
