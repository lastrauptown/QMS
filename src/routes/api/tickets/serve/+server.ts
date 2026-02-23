import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { ticketId } = await request.json();

		if (!ticketId) {
			return json({ error: 'Ticket ID is required' }, { status: 400 });
		}

		// 1. Get ticket to find counter
		const [tickets]: any = await db.query('SELECT counter_id FROM tickets WHERE id = ?', [ticketId]);
		const ticket = tickets[0];

		if (!ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		// 2. Update ticket status
		const now = new Date();
		await db.query(
			'UPDATE tickets SET status = ?, served_at = ? WHERE id = ?',
			['served', now, ticketId]
		);

		// 3. Clear counter current ticket
		if (ticket.counter_id) {
			await db.query('UPDATE counters SET current_ticket = NULL WHERE id = ?', [ticket.counter_id]);
		}

		// Fetch updated ticket
		const [updatedTickets]: any = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);

		return json({ ticket: updatedTickets[0] });
	} catch (error: any) {
		console.error('Error serving ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
