<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import type { Service } from '$lib/stores/queue';
	import { fade, scale } from 'svelte/transition';
	import { isLoading } from '$lib/stores/ui';

	let services: Service[] = [];
	let creatingTicket = false;
	let newTicket: any = null;
	let error: string | null = null;

	onMount(async () => {
		isLoading.set(true);
		try {
			const { data, error: err } = await supabase
				.from('services')
				.select('*')
				.eq('is_active', true)
				.order('name');
			
			if (err) throw err;
			services = data || [];
		} catch (e: any) {
			console.error('Error fetching services:', e);
			error = 'Could not load services. Please contact support.';
		} finally {
			isLoading.set(false);
		}
	});

	async function handleServiceClick(service: Service) {
		if (creatingTicket) return;
		creatingTicket = true;
		error = null;

		// Show a mini loading state or just keep the button disabled
		// We don't use global isLoading here to avoid full screen spinner for a quick action
		
		try {
			const response = await fetch('/api/tickets/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ serviceCode: service.code })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create ticket');
			}

			newTicket = result.ticket;
			
			// Auto-close modal after 5 seconds
			setTimeout(() => {
				closeModal();
			}, 5000);

		} catch (e: any) {
			console.error('Error creating ticket:', e);
			error = e.message || 'Failed to create ticket. Please try again.';
			setTimeout(() => {
				error = null;
				creatingTicket = false;
			}, 3000);
		}
	}

	function closeModal() {
		newTicket = null;
		creatingTicket = false;
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<!-- Header -->
	<header class="bg-forest-green text-white py-6 shadow-lg">
		<div class="container mx-auto px-4 flex items-center justify-center relative">
			<img src="/logo-sanpedro.png" alt="Logo" class="h-16 w-16 absolute left-4 object-contain" />
			<div class="text-center">
				<h1 class="text-3xl font-bold">City of San Pedro, Laguna</h1>
				<p class="text-lg opacity-90">Queue Management System</p>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center">
		{#if error && !creatingTicket}
			<div class="bg-red-50 border-l-4 border-red-500 p-8 rounded shadow-lg max-w-2xl w-full text-center mb-8" transition:fade>
				<p class="text-red-700 text-xl font-semibold mb-2">System Error</p>
				<p class="text-gray-700">{error}</p>
			</div>
		{/if}

		{#if services.length === 0 && !$isLoading}
			<div class="text-center text-gray-500">
				<p class="text-xl">No services available at the moment.</p>
				<p class="mt-2">Please check back later.</p>
			</div>
		{:else if services.length > 0}
			<div class="text-center mb-12">
				<h2 class="text-4xl font-bold text-gray-800 mb-4">Welcome!</h2>
				<p class="text-xl text-gray-600">Please select a service to get your ticket number.</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
				{#each services as service}
					<button
						on:click={() => handleServiceClick(service)}
						class="bg-white hover:bg-green-50 border-2 border-gray-200 hover:border-forest-green rounded-2xl p-8 shadow-md hover:shadow-xl transition-all transform hover:-translate-y-1 group text-left h-full flex flex-col"
						disabled={creatingTicket}
					>
						<div class="flex items-start justify-between mb-4">
							<span class="bg-gray-100 text-gray-600 font-mono font-bold px-3 py-1 rounded text-sm group-hover:bg-forest-green group-hover:text-white transition-colors">
								{service.code}
							</span>
						</div>
						<h3 class="text-2xl font-bold text-gray-900 mb-2 group-hover:text-forest-green transition-colors">
							{service.name}
						</h3>
						{#if service.description}
							<p class="text-gray-500 text-lg leading-relaxed flex-grow">
								{service.description}
							</p>
						{/if}
						<div class="mt-6 pt-4 border-t border-gray-100 w-full flex items-center text-forest-green font-semibold">
							<span>Get Ticket</span>
							<svg class="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
							</svg>
						</div>
					</button>
				{/each}
			</div>

			{#if services.length === 0}
				<div class="text-center text-gray-500 py-12">
					<p class="text-xl">No services available at the moment.</p>
				</div>
			{/if}
		{/if}
	</main>

	<!-- Footer -->
	<footer class="bg-gray-800 text-white py-4 mt-auto">
		<div class="container mx-auto px-4 text-center text-sm opacity-60">
			<p>&copy; {new Date().getFullYear()} City Government of San Pedro. All rights reserved.</p>
			<p class="mt-1 text-xs">Developed by Mark Joshua Punzalan OJT</p>
			<a href="/login" class="inline-block mt-2 hover:text-white transition-colors">Staff Login</a>
		</div>
	</footer>
</div>

<!-- Ticket Modal -->
{#if newTicket}
	<div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" transition:fade>
		<div 
			class="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center transform" 
			transition:scale={{ start: 0.9 }}
		>
			<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-8 h-8 text-forest-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			
			<h3 class="text-2xl font-bold text-gray-900 mb-2">Ticket Created!</h3>
			<p class="text-gray-500 mb-6">Please take your ticket number</p>
			
			<div class="bg-gray-100 rounded-xl p-6 mb-6 border-2 border-dashed border-gray-300">
				<p class="text-sm text-gray-500 font-mono mb-1">YOUR NUMBER</p>
				<p class="text-6xl font-black text-forest-green tracking-tight">
					{newTicket.ticket_number}
				</p>
				<p class="text-xs text-gray-400 mt-2">
					{new Date().toLocaleDateString()} • {new Date().toLocaleTimeString()}
				</p>
			</div>

			<p class="text-sm text-gray-500 animate-pulse">
				Printing ticket...
			</p>
			
			<button 
				on:click={closeModal}
				class="mt-6 w-full btn-secondary py-3 rounded-xl"
			>
				Close
			</button>
		</div>
	</div>
{/if}

<!-- Error Toast -->
{#if error && creatingTicket}
	<div class="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center" transition:fade>
		<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
		</svg>
		<span>{error}</span>
	</div>
{/if}
