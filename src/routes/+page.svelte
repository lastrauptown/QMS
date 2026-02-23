<script lang="ts">
	import { onMount } from 'svelte';
	import type { Service } from '$lib/stores/queue';
	import { fade, scale } from 'svelte/transition';
	import { isLoading } from '$lib/stores/ui';

	let services: Service[] = [];
	let creatingTicket = false;
	let newTicket: any = null;
	let error: string | null = null;

	function printTicket() {
		if (!newTicket) return;
		const serviceName = services.find(s => s.code === newTicket.service_code)?.name || 'Service';
		const ts = new Date().toLocaleString();
		const html = `
		<!doctype html>
		<html>
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<title>Ticket ${newTicket.ticket_number}</title>
			<style>
				@page { size: A4 portrait; margin: 10mm; }
				@media print {
					@page { size: portrait; }
				}
				html, body { padding: 0; margin: 0; }
				body { 
					font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; 
					-webkit-print-color-adjust: exact;
					print-color-adjust: exact;
				}
				.ticket {
					width: 100%;
					max-width: 150mm;
					margin: 0 auto;
					text-align: center;
					page-break-inside: avoid;
					padding: 6mm 0;
				}
				.header { font-size: 18px; font-weight: 800; }
				.sub { font-size: 12px; color: #333; }
				.number { font-size: 72px; font-weight: 900; color: #1b5e20; line-height: 1.05; margin: 10px 0; }
				.service { font-size: 20px; font-weight: 800; margin-top: 6px; }
				.meta { font-size: 12px; margin-top: 8px; }
				hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
			</style>
		</head>
		<body>
			<div class="ticket">
				<div class="header">City of San Pedro, Laguna</div>
				<div class="sub">Queue Ticket</div>
				<hr>
				<div class="number">${newTicket.ticket_number}</div>
				<div class="service">${serviceName}</div>
				<div class="meta">${ts}</div>
				<hr>
				<div class="sub">Please wait for your number to be called</div>
			</div>
		</body>
		</html>`;
		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		iframe.style.width = '0';
		iframe.style.height = '0';
		iframe.style.border = '0';
		document.body.appendChild(iframe);
		const doc = iframe.contentDocument || iframe.contentWindow?.document;
		if (!doc) return;
		doc.open();
		doc.write(html);
		doc.close();
		iframe.onload = () => {
			iframe.contentWindow?.focus();
			iframe.contentWindow?.print();
			setTimeout(() => document.body.removeChild(iframe), 500);
		};
	}

	onMount(async () => {
		isLoading.set(true);
		try {
			const response = await fetch('/api/services');
			const data = await response.json().catch(() => null);
			if (!response.ok) {
				error = (data && data.error) ? data.error : `Server error (${response.status}) while loading services`;
				try {
					const dbg = await fetch('/api/debug').then(r => r.json());
					if (dbg && dbg.mysql_connected === false && dbg.message) {
						error = `Database connection failed: ${dbg.message}${dbg.code ? ` [${dbg.code}]` : ''}`;
					}
				} catch {}
			} else {
				services = (data.services || []).filter((s: Service) => s.is_active);
			}
		} catch (e: any) {
			console.error('Error fetching services:', e);
			if ((e && e.name === 'TypeError') || (e && e.message && (e.message.includes('Failed to fetch') || e.message.includes('ERR_NAME_NOT_RESOLVED')))) {
				error = 'Network Error: Cannot connect to server. Please check your internet connection.';
			} else {
				error = 'Could not load services. Please contact support.';
			}
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
			printTicket();
			
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
	<main class="flex-grow container mx-auto px-4 py-16 flex flex-col items-center justify-center">
		{#if error && !creatingTicket}
			<div class="bg-red-50 border-l-4 border-red-500 p-8 rounded shadow-lg max-w-2xl w-full text-center mb-12" transition:fade>
				<p class="text-red-700 text-xl font-semibold mb-2">System Error</p>
				<p class="text-gray-700">{error}</p>
			</div>
		{/if}

		{#if newTicket}
			<!-- ... modal remains same ... -->
			<div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" transition:fade>
				<div class="bg-white rounded-[3rem] shadow-2xl p-12 max-w-xl w-full mx-4 text-center border-8 border-forest-green transform transition-all" transition:scale>
					<div class="mb-8">
						<div class="h-28 w-28 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
							<svg class="h-16 w-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<h2 class="text-5xl font-black text-gray-900 mb-3 tracking-tight">Success!</h2>
						<p class="text-2xl text-gray-600 font-medium">Your ticket is ready</p>
					</div>

					<div class="bg-forest-green/5 p-10 rounded-[2.5rem] mb-10 border-4 border-dashed border-forest-green/30">
						<p class="text-xl text-forest-green uppercase font-black tracking-[0.2em] mb-2">Your Number</p>
						<p class="text-9xl font-black text-forest-green tracking-tighter drop-shadow-sm">{newTicket.ticket_number}</p>
						<p class="text-3xl font-black text-gray-800 mt-6">{services.find(s => s.code === newTicket.service_code)?.name || 'Service'}</p>
					</div>

					<button
						on:click={closeModal}
						class="w-full bg-forest-green text-white py-6 px-8 rounded-2xl text-3xl font-black hover:bg-forest-green-dark transition-all duration-200 shadow-[0_10px_0_0_#1b5e20] active:shadow-none active:translate-y-2"
					>
						Done
					</button>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-7xl">
				{#each services as service}
					<button
						class="bg-white p-8 rounded-[2.5rem] shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_40px_rgba(46,125,50,0.18)] transition-all duration-300 transform hover:-translate-y-2 text-center border-[4px] border-forest-green/25 hover:border-forest-green group relative overflow-hidden active:scale-95 active:shadow-inner"
						on:click={() => handleServiceClick(service)}
						disabled={creatingTicket}
					>
						<!-- Decorative corner accent -->
						<div class="absolute top-0 right-0 w-32 h-32 bg-forest-green/5 rounded-bl-full -mr-16 -mt-16 group-hover:bg-forest-green/10 transition-colors"></div>
						
						<div class="mb-8 flex flex-col items-center relative">
							<div class="mb-5 bg-forest-green p-4 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300 border-4 border-white">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if service.code === 'DOC'}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									{:else if service.code === 'PAY'}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
									{:else if service.code === 'INQ'}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
									{/if}
								</svg>
							</div>
							
							<h2 class="text-3xl font-black text-gray-900 group-hover:text-forest-green transition-colors tracking-tighter mb-3">
								{service.name}
							</h2>
							
							<div class="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-black bg-forest-green text-white shadow-md tracking-widest uppercase mb-3">
								{service.code}
							</div>
						</div>
						
						<p class="text-base text-gray-600 font-bold leading-snug max-w-[22rem] mx-auto">
							{service.description || 'Tap here to get your queue number'}
						</p>

						<div class="mt-10 flex justify-center">
  							<div class="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
								<div class="w-0 h-full bg-forest-green group-hover:w-full transition-all duration-700 ease-out"></div>
							</div>
						</div>
					</button>
				{/each}
				
				{#if services.length === 0 && !$isLoading && !error}
			<div class="col-span-full text-center py-12 bg-white rounded-lg shadow-sm">
				<p class="text-gray-500 text-xl">No services available at the moment.</p>
			</div>
		{/if}
			</div>
		{/if}
	</main>

	<!-- Footer -->
	<footer class="bg-gray-800 text-white py-8 mt-auto">
		<div class="container mx-auto px-4 text-center">
			<p class="opacity-75">&copy; {new Date().getFullYear()} City of San Pedro, Laguna. All rights reserved.</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		background-color: #f9fafb;
	}
</style>
