import { writable, derived } from 'svelte/store';

export interface Ticket {
	id: string;
	service_code: string;
	number: number;
	ticket_number: string;
	status: 'waiting' | 'called' | 'served' | 'skipped';
	counter_id: string | null;
	created_at: string;
	updated_at?: string;
	called_at: string | null;
	served_at: string | null;
}

export interface Counter {
	id: string;
	name: string;
	service_id: string;
	is_active: boolean;
	current_ticket: string | null;
}

export interface Service {
	id: string;
	code: string;
	name: string;
	description: string | null;
	is_active: boolean;
}

export const tickets = writable<Ticket[]>([]);
export const counters = writable<Counter[]>([]);
export const services = writable<Service[]>([]);
export const currentTickets = writable<Map<string, Ticket>>(new Map());

// Retry helper with exponential backoff
async function retryOperation<T>(
	operation: () => Promise<T>,
	maxRetries: number = 3,
	delay: number = 1000
): Promise<T> {
	let lastError: any;
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			console.warn(`Operation failed, retrying (${i + 1}/${maxRetries})...`, error);
			await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
		}
	}
	throw lastError;
}

export async function initializeRealtime() {
	// Start polling immediately as the primary mechanism for MySQL
	startPolling();
	console.log('Queue initialized with polling (MySQL backend)');
}

export async function fetchTickets() {
	return retryOperation(async () => {
		console.log('Fetching tickets...');
		let data: Ticket[] | null = null;
		
		const response = await fetch('/api/tickets/recent');
		if (!response.ok) {
			throw new Error(`Failed to fetch tickets: ${response.statusText}`);
		}
		
		const apiResult = await response.json();
		data = apiResult.tickets || [];

		console.log(`Fetched ${data?.length || 0} tickets`);
		tickets.set(data || []);
		updateCurrentTickets(data || []);
	});
}

export async function fetchCounters() {
	return retryOperation(async () => {
		console.log('Fetching counters...');
		let data: Counter[] | null = null;

		const response = await fetch(`/api/counters?t=${Date.now()}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch counters: ${response.statusText}`);
		}

		const apiResult = await response.json();
		data = apiResult.counters || [];
		
		console.log('Fetched counters:', data);
		counters.set(data || []);
	});
}

export async function fetchServices() {
	return retryOperation(async () => {
		let data: Service[] | null = null;

		const response = await fetch(`/api/services?t=${Date.now()}`);
		if (!response.ok) {
			throw new Error(`Failed to fetch services: ${response.statusText}`);
		}

		const apiResult = await response.json();
		data = apiResult.services || [];

		services.set(data || []);
	});
}

function updateCurrentTickets(ticketList: Ticket[]) {
	const activeTickets = new Map<string, Ticket>();
	const today = new Date().toISOString().split('T')[0];
	
	ticketList.forEach((ticket) => {
		// Filter for today's tickets
		if (!ticket.created_at.startsWith(today)) {
			// For MySQL date strings which might be different, strict string match might be risky
			// but API should return ISO strings.
			// Let's be safe and check if it parses to same day
			const tDate = new Date(ticket.created_at).toISOString().split('T')[0];
			if (tDate !== today) return;
		}

		if (ticket.status === 'called' && ticket.counter_id) {
			// Ensure we don't overwrite if we already have one (though usually only one called per counter)
			// But if logic allows multiple, we prefer the most recent one (which comes first in list usually)
			if (!activeTickets.has(ticket.counter_id)) {
				activeTickets.set(ticket.counter_id, ticket);
			}
		}
	});
	
	currentTickets.set(activeTickets);
}

export async function createTicket(serviceCode: string) {
	if (!serviceCode) throw new Error('Service code is required');

	const response = await fetch('/api/tickets/create', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ serviceCode })
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('Create ticket error:', result);
		throw new Error(result.error || 'Failed to create ticket. Please try again.');
	}

	return result.ticket;
}

export async function callTicket(ticketId: string, counterId: string) {
	if (!ticketId || !counterId) throw new Error('Ticket ID and Counter ID are required');

	const response = await fetch('/api/tickets/call', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ticketId, counterId })
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('Call ticket error:', result);
		throw new Error(result.error || 'Failed to call ticket. Please try again.');
	}

	return result.ticket;
}

export async function serveTicket(ticketId: string) {
	if (!ticketId) throw new Error('Ticket ID is required');

	const response = await fetch('/api/tickets/serve', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ticketId })
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('Serve ticket error:', result);
		throw new Error(result.error || 'Failed to complete service. Please try again.');
	}

	return result.ticket;
}

export async function skipTicket(ticketId: string) {
	if (!ticketId) throw new Error('Ticket ID is required');

	const response = await fetch('/api/tickets/skip', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ticketId })
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('Skip ticket error:', result);
		throw new Error(result.error || 'Failed to skip ticket. Please try again.');
	}

	return result.ticket;
}

export async function recallTicket(ticketId: string) {
	if (!ticketId) throw new Error('Ticket ID is required');

	const response = await fetch('/api/tickets/recall', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ticketId })
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('Recall ticket error:', result);
		throw new Error(result.error || 'Failed to recall ticket. Please try again.');
	}

	return result.ticket;
}

export async function transferTicket(ticketId: string, newCounterId: string) {
	if (!ticketId || !newCounterId) throw new Error('Ticket ID and New Counter ID are required');

	const response = await fetch('/api/tickets/transfer', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ticketId, newCounterId })
	});

	const result = await response.json();

	if (!response.ok) {
		console.error('Transfer ticket error:', result);
		throw new Error(result.error || 'Failed to transfer ticket. Please try again.');
	}

	return result.ticket;
}

// Polling fallback
let pollingInterval: any = null;

function startPolling() {
	if (pollingInterval) return;
	
	console.log('Starting polling...');
	// Initial fetch
	fetchTickets().catch(console.error);
	fetchCounters().catch(console.error);
	
	pollingInterval = setInterval(() => {
		fetchTickets().catch(console.error);
		fetchCounters().catch(console.error);
	}, 2000); // Poll every 2 seconds
}

export function stopPolling() {
	if (pollingInterval) {
		clearInterval(pollingInterval);
		pollingInterval = null;
	}
}

// Statistics Helpers
export function calculateWaitTime(ticket: Ticket): number {
	if (!ticket.created_at || !ticket.called_at) return 0;
	const created = new Date(ticket.created_at).getTime();
	const called = new Date(ticket.called_at).getTime();
	return Math.max(0, (called - created) / 1000 / 60); // minutes
}

export function calculateServiceTime(ticket: Ticket): number {
	if (!ticket.called_at || !ticket.served_at) return 0;
	const called = new Date(ticket.called_at).getTime();
	const served = new Date(ticket.served_at).getTime();
	return Math.max(0, (served - called) / 1000 / 60); // minutes
}

export function getTodayStats(counterId: string, allTickets: Ticket[]) {
	const today = new Date().toISOString().split('T')[0];
	const counterTickets = allTickets.filter(t => 
		(t.counter_id === counterId || t.status === 'waiting') && 
		t.created_at.startsWith(today)
	);

	const served = counterTickets.filter(t => t.status === 'served' && t.counter_id === counterId);
	
	// Average Service Time
	const serviceTimes = served.map(calculateServiceTime);
	const avgServiceTime = serviceTimes.length > 0 
		? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length 
		: 0;

	// Average Wait Time
	const waitTimes = served.map(calculateWaitTime);
	const avgWaitTime = waitTimes.length > 0 
		? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length 
		: 0;

	// Completion Rate (Served / (Served + Skipped))
	// Note: This is a simplified metric. Could also be Served / Total Assigned
	const skipped = counterTickets.filter(t => t.status === 'skipped' && t.counter_id === counterId);
	const totalProcessed = served.length + skipped.length;
	const completionRate = totalProcessed > 0 
		? (served.length / totalProcessed) * 100 
		: 0;

	// Current Estimated Wait Time (based on avg service time * people ahead)
	// This is a rough estimate
	const waitingCount = counterTickets.filter(t => t.status === 'waiting').length;
	const currentWaitTime = waitingCount * (avgServiceTime || 5); // Default to 5 mins if no data

	return {
		ticketsServed: served.length,
		avgServiceTime,
		avgWaitTime,
		completionRate,
		currentWaitTime
	};
}

export function getAllCounterStats(counters: Counter[], tickets: Ticket[]) {
	const statsMap = new Map();
	counters.forEach(counter => {
		statsMap.set(counter.id, getTodayStats(counter.id, tickets));
	});
	return statsMap;
}

export function getServiceStats(serviceCode: string, tickets: Ticket[], services: Service[]) {
	const service = services.find(s => s.code === serviceCode);
	const today = new Date().toISOString().split('T')[0];
	const serviceTickets = tickets.filter(t => t.service_code === serviceCode && t.created_at.startsWith(today));
	
	const served = serviceTickets.filter(t => t.status === 'served');
	const waitTimes = served.map(calculateWaitTime);
	const serviceTimes = served.map(calculateServiceTime);
	
	const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length : 0;
	const avgServiceTime = serviceTimes.length > 0 ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length : 0;
	
	return {
		serviceName: service?.name || 'Unknown',
		serviceCode,
		totalTickets: serviceTickets.length,
		servedTickets: served.length,
		avgWaitTime,
		avgServiceTime
	};
}
