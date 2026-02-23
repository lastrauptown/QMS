<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { userProfile, signOut, checkAuth } from '$lib/stores/auth';
	import { get } from 'svelte/store';
	import {
		tickets,
		counters,
		services,
		fetchTickets,
		fetchCounters,
		fetchServices,
		callTicket,
		serveTicket,
		skipTicket,
		recallTicket,
		transferTicket,
		initializeRealtime,
		getTodayStats,
		calculateServiceTime,
		calculateWaitTime
	} from '$lib/stores/queue';
	import { playTicketSound } from '$lib/stores/sound';
	import { isLoading } from '$lib/stores/ui';

	let currentCounter: any = null;
	let nextTicket: any = null;
	let historyTickets: any[] = [];
	let counterStats: any = null;
	let currentService: any = null;
	let historyFilter = { date: '', status: '' };
	let processing = false;
	let elapsedString = '00:00';
	let timerInterval: any;
	let showTransferModal = false;
	let selectedTransferCounter = '';
	let controllerWindow: Window | null = null;

	onMount(async () => {
		isLoading.set(true);
		timerInterval = setInterval(updateElapsedTime, 1000);
		try {
			if (!get(userProfile)) {
				await checkAuth();
			}

			const prof = get(userProfile);
			if (!prof || (prof.role !== 'counter_staff' && prof.role !== 'admin')) {
				goto('/login');
				return;
			}

			await Promise.all([
				fetchServices(),
				fetchCounters(),
				fetchTickets(),
				initializeRealtime()
			]);

			if (prof.counter_id) {
				currentCounter = $counters.find((c) => c.id === prof.counter_id);
				if (currentCounter) {
					currentService = $services.find((s) => s.id === currentCounter.service_id);
				}
				if (currentCounter?.id) {
					localStorage.setItem('activeCounterId', currentCounter.id);
				}
				loadNextTicket();
				loadHistory();
				loadStats();
			}
		} catch (error) {
			console.error('Initialization error:', error);
		} finally {
			isLoading.set(false);
		}

		tickets.subscribe(() => {
			loadNextTicket();
			loadHistory();
			loadStats();
		});
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});

	function updateElapsedTime() {
		const current = historyTickets.find((t) => t.status === 'called');
		if (current && current.called_at) {
			const start = new Date(current.called_at).getTime();
			const now = new Date().getTime();
			const diff = Math.max(0, now - start);
			
			const minutes = Math.floor(diff / 60000);
			const seconds = Math.floor((diff % 60000) / 1000);
			
			elapsedString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			elapsedString = '00:00';
		}
	}

	function selectCounter(counterId: string) {
		currentCounter = $counters.find((c) => c.id === counterId);
		if (currentCounter) {
			currentService = $services.find((s) => s.id === currentCounter.service_id);
			if (currentCounter?.id) {
				localStorage.setItem('activeCounterId', currentCounter.id);
			}
			loadNextTicket();
			loadHistory();
			loadStats();
		}
	}

	function loadNextTicket() {
		if (!currentCounter) {
			console.log('loadNextTicket: No current counter set');
			return;
		}

		const serviceCode = getServiceCode();
		console.log(`loadNextTicket: Filtering for status='waiting' and service_code='${serviceCode}'`);
		
		const waitingTickets = $tickets.filter(
			(t) => t.status === 'waiting' && t.service_code === serviceCode
		);
		
		console.log(`loadNextTicket: Found ${waitingTickets.length} waiting tickets for this service`);
		if ($tickets.length > 0) {
			console.log('loadNextTicket: Sample ticket from store:', $tickets[0]);
		}

		nextTicket = waitingTickets.sort((a, b) => a.number - b.number)[0] || null;
	}

	function loadHistory() {
		if (!currentCounter) return;

		const serviceCode = getServiceCode();
		// Filter by service code to show all tickets for this service (including those served by other counters)
		// AND include tickets assigned to this counter specifically (to fix visibility if service code mismatches)
		let filtered = $tickets.filter((t) => 
			t.service_code === serviceCode || t.counter_id === currentCounter.id
		);
		
		if (historyFilter.date) {
			filtered = filtered.filter((t) => t.created_at.startsWith(historyFilter.date));
		}
		if (historyFilter.status) {
			filtered = filtered.filter((t) => t.status === historyFilter.status);
		}

		historyTickets = filtered
			.sort((a, b) => {
				const dateA = new Date(a.called_at || a.created_at).getTime();
				const dateB = new Date(b.called_at || b.created_at).getTime();
				return dateB - dateA;
			})
			.slice(0, 50);
	}

	function loadStats() {
		if (!currentCounter) return;
		counterStats = getTodayStats(currentCounter.id, $tickets);
	}

	function exportHistory() {
		const csv = [
			['Ticket Number', 'Status', 'Created At', 'Called At', 'Served At', 'Wait Time (min)', 'Service Time (min)'].join(','),
			...historyTickets.map((t) => {
				const waitTime = calculateWaitTime(t);
				const serviceTime = calculateServiceTime(t);
				return [
					t.ticket_number,
					t.status,
					t.created_at,
					t.called_at || '-',
					t.served_at || '-',
					waitTime > 0 ? waitTime.toFixed(1) : '-',
					serviceTime > 0 ? serviceTime.toFixed(1) : '-'
				].join(',');
			})
		].join('\n');
		
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `history-${currentCounter.name}-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	$: if (historyFilter.date || historyFilter.status) {
		loadHistory();
	}

	function getServiceCode() {
		if (!currentCounter) return '';
		const service = $services.find((s) => s.id === currentCounter.service_id);
		return service?.code || '';
	}

	

	function openController() {
		const features = [
			'width=380',
			'height=520',
			'menubar=no',
			'toolbar=no',
			'location=no',
			'status=no',
			'scrollbars=yes'
		].join(',');
		controllerWindow = window.open('/counter/controller', 'counter_controller', features);
	}

	async function handleCallNext() {
		if (!nextTicket || !currentCounter || processing) return;

		processing = true;
		try {
			const toCall = nextTicket;
			await callTicket(toCall.id, currentCounter.id);
			playTicketSound();
			await fetchTickets();
		} catch (error: any) {
			alert(error.message);
		} finally {
			processing = false;
		}
	}

	async function handleServe() {
		const current = historyTickets.find((t) => t.status === 'called');
		if (!current || processing) return;

		processing = true;
		try {
			await serveTicket(current.id);
			await fetchTickets();
		} catch (error: any) {
			alert(error.message);
		} finally {
			processing = false;
		}
	}

	async function handleRecall() {
		const lastCalled = historyTickets.find((t) => t.status === 'called');
		if (!lastCalled || processing) return;

		processing = true;
		try {
			const toRecall = lastCalled;
			await recallTicket(toRecall.id);
			playTicketSound();
			await fetchTickets();
		} catch (error: any) {
			alert(error.message);
		} finally {
			processing = false;
		}
	}

	async function handleSkip() {
		const current = historyTickets.find((t) => t.status === 'called');
		if (!current || processing) return;

		processing = true;
		try {
			await skipTicket(current.id);
			await fetchTickets();
		} catch (error: any) {
			alert(error.message);
		} finally {
			processing = false;
		}
	}

	async function handleTransfer() {
		const current = historyTickets.find((t) => t.status === 'called');
		if (!current || processing) return;

		showTransferModal = true;
	}

	async function confirmTransfer() {
		const current = historyTickets.find((t) => t.status === 'called');
		if (!current || !selectedTransferCounter || processing) return;

		processing = true;
		try {
			await transferTicket(current.id, selectedTransferCounter);
			await fetchTickets();
			showTransferModal = false;
			selectedTransferCounter = '';
		} catch (error: any) {
			alert(error.message);
		} finally {
			processing = false;
		}
	}

	async function toggleCounterStatus() {
		if (!currentCounter || processing) return;
		
		processing = true;
		try {
			const response = await fetch('/api/counters/status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					counterId: currentCounter.id,
					isActive: !currentCounter.is_active
				})
			});
			
			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to update status');
			}
			
			await fetchCounters();
			// Update local state immediately for responsiveness
			currentCounter.is_active = !currentCounter.is_active;
		} catch (error: any) {
			alert(error.message);
		} finally {
			processing = false;
		}
	}

	async function handleLogout() {
		await signOut();
		localStorage.removeItem('activeCounterId');
		goto('/login');
	}
</script>

{#if !$userProfile || $userProfile.role !== 'counter_staff'}
	<div class="min-h-screen flex items-center justify-center">
		<p>Redirecting...</p>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="bg-forest-green text-white px-8 py-4 shadow-lg">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<img
						src="/logo-sanpedro.png"
						alt="City of San Pedro, Laguna"
						class="h-12 w-12 object-contain"
					/>
					<div>
						<h1 class="text-xl font-bold">Counter Dashboard</h1>
						<p class="text-xs text-white/80">City of San Pedro, Laguna</p>
					</div>
					{#if currentCounter}
						<span class="text-sm bg-white/20 px-3 py-1 rounded">{currentCounter.name}</span>
						{#if currentService}
							<span class="text-xs bg-white/10 px-3 py-1 rounded border border-white/20">
								{currentService.name} ({currentService.code})
							</span>
						{/if}
					{/if}
				</div>
				<div class="flex items-center gap-3">
					<button on:click={handleLogout} class="text-sm hover:underline">Logout</button>
				</div>
			</div>
		</header>

		

		<main class="px-8 py-8 max-w-6xl mx-auto">
			{#if currentCounter}
				<!-- Counter Status Panel -->
				<div class="card mb-8 {currentCounter.is_active ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500 bg-red-50'}">
					<div class="flex items-center justify-between">
						<div>
							<h2 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
								<span class="w-3 h-3 rounded-full {currentCounter.is_active ? 'bg-green-500' : 'bg-red-500'} animate-pulse"></span>
								{currentCounter.is_active ? 'Online & Available' : 'Offline / Unavailable'}
							</h2>
							<p class="text-gray-600 mt-1">
								{currentCounter.is_active 
									? 'You are visible to the public and can call tickets.' 
									: 'Counter is closed. Tickets cannot be called.'}
							</p>
						</div>
						<button 
							on:click={toggleCounterStatus}
							disabled={processing}
							class="px-6 py-3 rounded-lg font-bold shadow-sm transition-all transform hover:scale-105 {currentCounter.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-600 text-white hover:bg-green-700'} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
						>
							{processing ? 'Updating...' : (currentCounter.is_active ? 'Go Unavailable' : 'Go Online')}
						</button>
					</div>
				</div>

				<!-- Current Ticket Actions -->
				{#if historyTickets.find((t) => t.status === 'called')}
					{@const current = historyTickets.find((t) => t.status === 'called')}
					<div class="card mb-8 border-2 border-forest-green">
						<div class="flex justify-between items-start mb-6">
							<div>
								<span class="bg-forest-green text-white px-3 py-1 rounded-full text-sm font-bold mb-2 inline-block">SERVING NOW</span>
								<h2 class="text-4xl font-black text-gray-900">
									{current.ticket_number}
								</h2>
								<p class="text-gray-500 text-sm mt-1">Called at {new Date(current.called_at).toLocaleTimeString()}</p>
							</div>
							<div class="text-right">
								<div class="flex items-center justify-end gap-2">
									<button on:click={openController} class="text-xs bg-green-50 text-forest-green px-3 py-1 rounded border border-forest-green/30 hover:bg-green-100 transition-colors">
										Open Controller
									</button>
									<div class="text-right">
										<p class="text-sm text-gray-500">Elapsed Time</p>
										<p class="text-4xl font-mono font-bold text-forest-green animate-pulse">{elapsedString}</p>
									</div>
								</div>
							</div>
						</div>
						
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<button on:click={handleServe} class="col-span-1 md:col-span-2 bg-forest-green text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-forest-green-600 transition-colors shadow-md flex items-center justify-center gap-2">
								Complete Service
							</button>
							
							<div class="grid grid-cols-3 gap-2 col-span-1 md:col-span-2 mt-2 pt-4 border-t">
								<button on:click={handleRecall} class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded font-semibold hover:bg-yellow-200 transition-colors">
									Recall
								</button>
								<button on:click={handleSkip} class="bg-gray-100 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-200 transition-colors">
									Skip
								</button>
								<button on:click={handleTransfer} class="bg-blue-100 text-blue-800 px-4 py-2 rounded font-semibold hover:bg-blue-200 transition-colors">
									Transfer
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Next Ticket Card -->
				<div class="card mb-8 {currentCounter.is_active ? '' : 'opacity-50 grayscale pointer-events-none'}">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-2xl font-bold text-gray-900">Next Ticket</h2>
						<button on:click={openController} class="text-xs bg-green-50 text-forest-green px-3 py-1 rounded border border-forest-green/30 hover:bg-green-100 transition-colors">
							Open Controller
						</button>
					</div>
					{#if nextTicket}
						<div class="text-center py-8">
							<p class="text-gray-600 mb-2">Ticket Number</p>
							<div class="text-7xl font-black text-gray-900 mb-6">
								{nextTicket.ticket_number}
							</div>
							<button on:click={handleCallNext} disabled={processing} class="btn-primary text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
								{processing ? 'Processing...' : 'Call Next'}
							</button>
						</div>
					{:else}
						<div class="text-center py-8 text-gray-500">
							<p class="text-lg">No tickets in queue</p>
							<p class="text-sm mb-4">Wait for new customers...</p>
							{#if historyTickets.length > 0}
								<div class="mt-4 pt-4 border-t border-gray-200">
									<p class="text-xs uppercase tracking-wide text-gray-400 mb-1">Last Processed</p>
									<p class="font-bold text-gray-700">{historyTickets[0].ticket_number}</p>
									<p class="text-xs text-gray-500">
										{historyTickets[0].status} at {new Date(historyTickets[0].updated_at || historyTickets[0].created_at).toLocaleTimeString()}
									</p>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Performance Stats -->
				<h2 class="text-2xl font-bold text-gray-900 mb-4 opacity-75">Performance Stats</h2>
				<div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<div class="card">
						<p class="text-gray-600 mb-2 text-sm">Tickets Served Today</p>
						<p class="text-3xl font-black text-gray-900">{counterStats?.ticketsServed || 0}</p>
					</div>
					<div class="card">
						<p class="text-gray-600 mb-2 text-sm">Avg Service Time</p>
						<p class="text-3xl font-black text-gray-900">
							{counterStats?.avgServiceTime ? counterStats.avgServiceTime.toFixed(1) : '0.0'} min
						</p>
					</div>
					<div class="card">
						<p class="text-gray-600 mb-2 text-sm">Avg Wait Time</p>
						<p class="text-3xl font-black text-gray-900">
							{counterStats?.avgWaitTime ? counterStats.avgWaitTime.toFixed(1) : '0.0'} min
						</p>
					</div>
					<div class="card">
						<p class="text-gray-600 mb-2 text-sm">Completion Rate</p>
						<p class="text-3xl font-black text-gray-900">
							{counterStats?.completionRate ? counterStats.completionRate.toFixed(0) : '0'}%
						</p>
					</div>
				</div>

				<!-- Service Information -->
				{#if currentService}
					<div class="card mb-8">
						<h2 class="text-2xl font-bold text-gray-900 mb-4">Service Information</h2>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<p class="text-sm text-gray-600 mb-1">Service Name</p>
								<p class="text-lg font-semibold text-gray-900">{currentService.name}</p>
							</div>
							<div>
								<p class="text-sm text-gray-600 mb-1">Service Code</p>
								<p class="text-lg font-semibold text-gray-900">{currentService.code}</p>
							</div>
							{#if currentService.description}
								<div class="md:col-span-2">
									<p class="text-sm text-gray-600 mb-1">Description</p>
									<p class="text-gray-900">{currentService.description}</p>
								</div>
							{/if}
							<div>
								<p class="text-sm text-gray-600 mb-1">Queue Status</p>
								<p class="text-lg font-semibold text-gray-900">
									{$tickets.filter((t) => t.service_code === currentService.code && t.status === 'waiting').length} waiting
								</p>
							</div>
							<div>
								<p class="text-sm text-gray-600 mb-1">Estimated Wait</p>
								<p class="text-lg font-semibold text-gray-900">
									{counterStats?.currentWaitTime ? counterStats.currentWaitTime.toFixed(0) : '0'} minutes
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Enhanced History -->
				<div class="card">
					<div class="flex justify-between items-center mb-4">
						<h2 class="text-2xl font-bold text-gray-900">Ticket History</h2>
						<button on:click={exportHistory} class="btn-secondary text-sm">
							Export CSV
						</button>
					</div>

					<!-- Filters -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<div>
							<label for="history-date" class="block text-sm font-medium mb-2">Date</label>
							<input
								id="history-date"
								type="date"
								bind:value={historyFilter.date}
								class="input-field"
							/>
						</div>
						<div>
							<label for="history-status" class="block text-sm font-medium mb-2">Status</label>
							<select id="history-status" bind:value={historyFilter.status} class="input-field">
								<option value="">All Status</option>
								<option value="waiting">Waiting</option>
								<option value="called">Called</option>
								<option value="served">Served</option>
								<option value="skipped">Skipped</option>
							</select>
						</div>
					</div>

					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b">
									<th class="text-left py-3 px-4 text-gray-700">Ticket</th>
									<th class="text-left py-3 px-4 text-gray-700">Status</th>
									<th class="text-left py-3 px-4 text-gray-700">Called At</th>
									<th class="text-left py-3 px-4 text-gray-700">Served At</th>
									<th class="text-left py-3 px-4 text-gray-700">Wait Time</th>
									<th class="text-left py-3 px-4 text-gray-700">Service Time</th>
								</tr>
							</thead>
							<tbody>
								{#each historyTickets as ticket}
									{@const waitTime = calculateWaitTime(ticket)}
									{@const serviceTime = calculateServiceTime(ticket)}
									<tr class="border-b hover:bg-gray-50">
										<td class="py-3 px-4 font-semibold">{ticket.ticket_number}</td>
										<td class="py-3 px-4">
											<span
												class="px-2 py-1 rounded text-sm {ticket.status === 'served'
													? 'bg-green-100 text-green-800'
													: ticket.status === 'called'
														? 'bg-blue-100 text-blue-800'
														: 'bg-gray-100 text-gray-800'}"
											>
												{ticket.status}
											</span>
										</td>
										<td class="py-3 px-4 text-gray-600">
											{ticket.called_at
												? new Date(ticket.called_at).toLocaleString()
												: '-'}
										</td>
										<td class="py-3 px-4 text-gray-600">
											{ticket.served_at
												? new Date(ticket.served_at).toLocaleString()
												: '-'}
										</td>
										<td class="py-3 px-4 text-gray-600">
											{waitTime > 0 ? waitTime.toFixed(1) + ' min' : '-'}
										</td>
										<td class="py-3 px-4 text-gray-600">
											{serviceTime > 0 ? serviceTime.toFixed(1) + ' min' : '-'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			{:else}
				<div class="card text-center py-12">
					{#if $userProfile.role === 'admin'}
						<h2 class="text-2xl font-bold text-gray-900 mb-4">Admin Mode</h2>
						<p class="text-gray-600 mb-6">Select a counter to operate:</p>
						<div class="max-w-md mx-auto">
							<div class="grid gap-4">
								{#each $counters.filter(c => c.is_active) as counter}
									<button 
										class="btn-secondary w-full text-left flex justify-between items-center"
										on:click={() => selectCounter(counter.id)}
									>
										<div>
											<span class="font-semibold block">{counter.name}</span>
											<span class="text-sm text-gray-500">
												{$services.find(s => s.id === counter.service_id)?.name || 'Unknown Service'}
											</span>
										</div>
										{#if counter.current_ticket}
											<span class="text-lg font-bold text-forest-green">{counter.current_ticket}</span>
										{/if}
									</button>
								{/each}
								{#if $counters.filter(c => c.is_active).length === 0}
									<p class="text-red-500">No active counters available.</p>
								{/if}
							</div>
						</div>
					{:else}
						<p class="text-gray-600 text-lg">No counter assigned to your account</p>
					{/if}
				</div>
			{/if}
			{#if showTransferModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
				<h3 class="text-xl font-bold mb-4">Transfer Ticket</h3>
				<p class="text-gray-600 mb-4">Select a counter to transfer this ticket to:</p>
				
				<div class="space-y-2 mb-6 max-h-60 overflow-y-auto">
					{#each $counters.filter(c => c.is_active && c.id !== currentCounter?.id) as counter}
						<label class="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 {selectedTransferCounter === counter.id ? 'border-forest-green bg-green-50' : ''}">
							<input 
								type="radio" 
								name="transfer-counter" 
								value={counter.id} 
								bind:group={selectedTransferCounter}
								class="mr-3"
							/>
							<div>
								<div class="font-semibold">{counter.name}</div>
								<div class="text-xs text-gray-500">
									{$services.find(s => s.id === counter.service_id)?.name}
								</div>
							</div>
						</label>
					{/each}
					{#if $counters.filter(c => c.is_active && c.id !== currentCounter?.id).length === 0}
						<p class="text-center text-gray-500 py-4">No other active counters available.</p>
					{/if}
				</div>

				<div class="flex justify-end gap-3">
					<button 
						on:click={() => { showTransferModal = false; selectedTransferCounter = ''; }}
						class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
					>
						Cancel
					</button>
					<button 
						on:click={confirmTransfer}
						disabled={!selectedTransferCounter || processing}
						class="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
					>
						{processing ? 'Transferring...' : 'Confirm Transfer'}
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>
	</div>
{/if}

