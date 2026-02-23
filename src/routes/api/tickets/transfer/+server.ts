import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { ticketId, newCounterId } = await request.json();

		if (!ticketId || !newCounterId) {
			return json({ error: 'Ticket ID and New Counter ID are required' }, { status: 400 });
		}

		// 1. Get current ticket to verify logic and get current counter
		const [tickets]: any = await db.query('SELECT counter_id FROM tickets WHERE id = ?', [ticketId]);
		const ticket = tickets[0];

		if (!ticket) {
			return json({ error: 'Ticket not found' }, { status: 404 });
		}

		// 2. Get target counter to get service code
		const [targetCounters]: any = await db.query('SELECT service_id FROM counters WHERE id = ?', [newCounterId]);
		const targetCounter = targetCounters[0];

		if (!targetCounter) {
			return json({ error: 'Target counter not found' }, { status: 404 });
		}

		// 3. Get target service to get code
		const [targetServices]: any = await db.query('SELECT code FROM services WHERE id = ?', [targetCounter.service_id]);
		const targetService = targetServices[0];

		if (!targetService) {
			return json({ error: 'Target service not found' }, { status: 404 });
		}

		// 4. Update ticket: set to waiting, assign to new counter, update service code
		await db.query(
			'UPDATE tickets SET status = ?, counter_id = ?, service_code = ?, called_at = NULL WHERE id = ?',
			['waiting', newCounterId, targetService.code, ticketId]
		);

		// 5. Clear current counter's display
		if (ticket.counter_id) {
			await db.query('UPDATE counters SET current_ticket = NULL WHERE id = ?', [ticket.counter_id]);
		}

		// Fetch updated ticket
		const [updatedTickets]: any = await db.query('SELECT * FROM tickets WHERE id = ?', [ticketId]);
		
		return json({ ticket: updatedTickets[0] });
	} catch (error: any) {
		console.error('Error transferring ticket:', error);
		return json({ error: error.message || 'Internal server error' }, { status: 500 });
	}
};
