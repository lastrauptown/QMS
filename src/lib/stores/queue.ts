import { writable, derived } from 'svelte/store';
import { supabase } from '../supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

let realtimeChannel: RealtimeChannel | null = null;

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
	// Start polling immediately as a fallback
	startPolling();

	if (realtimeChannel) return;

	try {
		realtimeChannel = supabase
			.channel('queue-updates')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'tickets'
				},
				(payload) => {
					console.log('Realtime ticket update:', payload.eventType);
					if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
						fetchTickets().catch(console.error);
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'counters'
				},
				() => {
					console.log('Realtime counter update');
					fetchCounters().catch(console.error);
				}
			)
			.subscribe((status) => {
				console.log('Realtime subscription status:', status);
				if (status === 'SUBSCRIBED') {
					console.log('Successfully subscribed to queue updates');
				} else if (status === 'CHANNEL_ERROR') {
					console.error('Realtime channel error, attempting reconnection...');
					cleanup();
					setTimeout(initializeRealtime, 5000);
				} else if (status === 'TIMED_OUT') {
					console.error('Realtime connection timed out, retrying...');
					cleanup();
					setTimeout(initializeRealtime, 5000);
				}
			});
	} catch (error) {
		console.error('Failed to initialize realtime:', error);
	}
}

export async function fetchTickets() {
	return retryOperation(async () => {
		console.log('Fetching tickets...');
		let data: Ticket[] | null = null;
		let error: any = null;

		const result = await supabase
			.from('tickets')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(100);

		data = result.data;
		error = result.error;

		// Fallback to API
		if (error || !data || data.length === 0) {
			try {
				const response = await fetch('/api/tickets/recent');
				if (response.ok) {
					const apiResult = await response.json();
					if (apiResult.tickets && apiResult.tickets.length > 0) {
						data = apiResult.tickets;
						error = null;
					}
				}
			} catch (apiError) {
				if (!error) error = apiError;
			}
		}

		if (error) {
			console.error('Error fetching tickets:', error);
			throw error;
		}
		
		console.log(`Fetched ${data?.length || 0} tickets`);
		tickets.set(data || []);
		updateCurrentTickets(data || []);
	});
}

export async function fetchCounters() {
	return retryOperation(async () => {
		console.log('Fetching counters...');
		let data: Counter[] | null = null;
		let error: any = null;

		// Try direct fetch first
		const result = await supabase
			.from('counters')
			.select('*')
			.order('name');
		
		data = result.data;
		error = result.error;

		// Fallback to API if RLS blocks access (returns empty) or errors
		// This ensures public display works even if RLS is strict
		if (error || !data || data.length === 0) {
			console.log('Direct fetch failed or empty, trying API fallback...');
			try {
				const response = await fetch(`/api/counters?t=${Date.now()}`);
				if (response.ok) {
					const apiResult = await response.json();
					if (apiResult.counters && apiResult.counters.length > 0) {
						console.log('Fetched counters via API:', apiResult.counters);
						data = apiResult.counters;
						error = null;
					} else {
						console.warn('API returned empty counters list:', apiResult);
					}
				} else {
					console.error('API request failed:', response.status, response.statusText);
					const text = await response.text();
					console.error('API response body:', text);
					throw new Error(`API failed: ${response.status} ${response.statusText}`);
				}
			} catch (apiError) {
				console.error('Error fetching from API:', apiError);
				// Don't overwrite the original error if API fails too, unless original was null
				if (!error) error = apiError;
			}
		}

		if (error) {
			console.error('Error fetching counters:', error);
			throw error;
		}
		console.log('Fetched counters:', data);
		counters.set(data || []);
	});
}

export async function fetchServices() {
	return retryOperation(async () => {
		let data: Service[] | null = null;
		let error: any = null;

		const result = await supabase
			.from('services')
			.select('*')
			.order('code');

		data = result.data;
		error = result.error;

		// Fallback to API
		if (error || !data || data.length === 0) {
			try {
				const response = await fetch(`/api/services?t=${Date.now()}`);
				if (response.ok) {
					const apiResult = await response.json();
					if (apiResult.services && apiResult.services.length > 0) {
						data = apiResult.services;
						error = null;
					}
				}
			} catch (apiError) {
				if (!error) error = apiError;
			}
		}

		if (error) throw error;
		services.set(data || []);
	});
}

function updateCurrentTickets(ticketList: Ticket[]) {
	const activeTickets = new Map<string, Ticket>();
	const today = new Date().toISOString().split('T')[0];
	
	ticketList.forEach((ticket) => {
		if (!ticket.created_at.startsWith(today)) {
			return;
		}

		if (ticket.status === 'called' && ticket.counter_id) {
			if (!activeTickets.has(ticket.counter_id)) {
				activeTickets.set(ticket.counter_id, ticket);
			}
		}
	});
	
	currentTickets.set(activeTickets);
}

export async function createTicket(serviceCode: string) {
	if (!serviceCode) throw new Error('Service code is required');

	const { data: service } = await supabase
		.from('services')
		.select('id')
		.eq('code', serviceCode)
		.single();

	if (!service) throw new Error(`Service not found: ${serviceCode}`);

	const { data: lastTicket } = await supabase
		.from('tickets')
		.select('number')
		.eq('service_code', serviceCode)
		.gte('created_at', new Date().toISOString().split('T')[0])
		.order('number', { ascending: false })
		.limit(1)
		.single();

	const nextNumber = lastTicket ? lastTicket.number + 1 : 1;
	const ticketNumber = `${serviceCode}-${String(nextNumber).padStart(3, '0')}`;

	const { data, error } = await supabase
		.from('tickets')
		.insert({
			service_code: serviceCode,
			number: nextNumber,
			ticket_number: ticketNumber,
			status: 'waiting'
		})
		.select()
		.single();

	if (error) {
		console.error('Create ticket error:', error);
		throw new Error('Failed to create ticket. Please try again.');
	}
	return data;
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
	
	// Poll every 3 seconds
	pollingInterval = setInterval(async () => {
		try {
			await Promise.all([
				fetchTickets(),
				fetchCounters()
			]);
		} catch (error) {
			console.error('Polling error:', error);
		}
	}, 3000);
}

export function cleanup() {
	if (realtimeChannel) {
		supabase.removeChannel(realtimeChannel);
		realtimeChannel = null;
	}
	if (pollingInterval) {
		clearInterval(pollingInterval);
		pollingInterval = null;
	}
}

// Analytics helper functions

export interface CounterStats {
	ticketsServed: number;
	avgServiceTime: number;
	avgWaitTime: number;
	completionRate: number;
	currentWaitTime: number;
}

export interface ServiceStats {
	serviceCode: string;
	serviceName: string;
	totalTickets: number;
	servedTickets: number;
	avgWaitTime: number;
	avgServiceTime: number;
}

// Calculate service time in minutes
export function calculateServiceTime(ticket: Ticket): number {
	if (!ticket.called_at || !ticket.served_at) return 0;
	const called = new Date(ticket.called_at).getTime();
	const served = new Date(ticket.served_at).getTime();
	return (served - called) / 1000 / 60; // minutes
}

// Calculate wait time in minutes
export function calculateWaitTime(ticket: Ticket): number {
	if (!ticket.called_at || !ticket.created_at) return 0;
	const created = new Date(ticket.created_at).getTime();
	const called = new Date(ticket.called_at).getTime();
	return (called - created) / 1000 / 60; // minutes
}

// Get counter statistics for a specific counter
export function getCounterStats(counterId: string, tickets: Ticket[]): CounterStats {
	const today = new Date().toISOString().split('T')[0];
	const counterTickets = tickets.filter(
		(t) => t.counter_id === counterId && t.created_at >= today
	);
	
	const servedTickets = counterTickets.filter((t) => t.status === 'served');
	const ticketsServed = servedTickets.length;
	
	let avgServiceTime = 0;
	let avgWaitTime = 0;
	let completionRate = 0;
	
	if (servedTickets.length > 0) {
		const serviceTimes = servedTickets
			.map(calculateServiceTime)
			.filter((t) => t > 0);
		avgServiceTime = serviceTimes.length > 0
			? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
			: 0;
		
		const waitTimes = servedTickets
			.map(calculateWaitTime)
			.filter((t) => t > 0);
		avgWaitTime = waitTimes.length > 0
			? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
			: 0;
		
		const totalCalled = counterTickets.filter((t) => t.status === 'called' || t.status === 'served').length;
		completionRate = totalCalled > 0 ? (ticketsServed / totalCalled) * 100 : 0;
	}
	
	// Current wait time for next ticket
	const waitingTickets = counterTickets.filter((t) => t.status === 'waiting');
	const currentWaitTime = waitingTickets.length > 0
		? waitingTickets.map((t) => {
				const created = new Date(t.created_at).getTime();
				const now = Date.now();
				return (now - created) / 1000 / 60;
			}).reduce((a, b) => a + b, 0) / waitingTickets.length
		: 0;
	
	return {
		ticketsServed,
		avgServiceTime,
		avgWaitTime,
		completionRate,
		currentWaitTime
	};
}

// Get today's statistics for counter staff
export function getTodayStats(counterId: string, tickets: Ticket[]): CounterStats {
	return getCounterStats(counterId, tickets);
}

// Get statistics for all counters (admin)
export function getAllCounterStats(counters: Counter[], tickets: Ticket[]): Map<string, CounterStats> {
	const stats = new Map<string, CounterStats>();
	counters.forEach((counter) => {
		stats.set(counter.id, getCounterStats(counter.id, tickets));
	});
	return stats;
}

// Get service statistics
export function getServiceStats(serviceCode: string, tickets: Ticket[], services: Service[]): ServiceStats {
	const today = new Date().toISOString().split('T')[0];
	const serviceTickets = tickets.filter(
		(t) => t.service_code === serviceCode && t.created_at >= today
	);
	
	const servedTickets = serviceTickets.filter((t) => t.status === 'served');
	const service = services.find((s) => s.code === serviceCode);
	
	let avgWaitTime = 0;
	let avgServiceTime = 0;
	
	if (servedTickets.length > 0) {
		const waitTimes = servedTickets.map(calculateWaitTime).filter((t) => t > 0);
		avgWaitTime = waitTimes.length > 0
			? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
			: 0;
		
		const serviceTimes = servedTickets.map(calculateServiceTime).filter((t) => t > 0);
		avgServiceTime = serviceTimes.length > 0
			? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
			: 0;
	}
	
	return {
		serviceCode,
		serviceName: service?.name || serviceCode,
		totalTickets: serviceTickets.length,
		servedTickets: servedTickets.length,
		avgWaitTime,
		avgServiceTime
	};
}

// Get staff performance (tickets served by a user)
export function getStaffPerformance(userId: string, counterId: string, tickets: Ticket[]): {
	ticketsServed: number;
	avgServiceTime: number;
	efficiency: number;
} {
	const today = new Date().toISOString().split('T')[0];
	const staffTickets = tickets.filter(
		(t) => t.counter_id === counterId && t.created_at >= today && t.status === 'served'
	);
	
	const ticketsServed = staffTickets.length;
	const serviceTimes = staffTickets.map(calculateServiceTime).filter((t) => t > 0);
	const avgServiceTime = serviceTimes.length > 0
		? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length
		: 0;
	
	// Efficiency: tickets per hour (assuming 8 hour work day)
	const efficiency = avgServiceTime > 0 ? 60 / avgServiceTime : 0;
	
	return {
		ticketsServed,
		avgServiceTime,
		efficiency
	};
}

