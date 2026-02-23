<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { userProfile, checkAuth } from '$lib/stores/auth';
	import {
		tickets,
		counters,
		services,
		fetchTickets,
		fetchCounters,
		fetchServices,
		initializeRealtime,
		callTicket,
		recallTicket,
		serveTicket,
		skipTicket,
		transferTicket
	} from '$lib/stores/queue';
	import { playTicketSound } from '$lib/stores/sound';
	import { isLoading } from '$lib/stores/ui';
	
	let currentCounter: any = null;
	let nextTicket: any = null;
	let currentTicket: any = null;
	let processing = false;
	let showOk = false;
	let showTransferModal = false;
	let selectedTransferCounter = '';
	let selectedCounterId = '';
	
	function getServiceCode() {
		if (!currentCounter) return '';
		const service = $services.find((s) => s.id === currentCounter.service_id);
		return service?.code || '';
	}
	
	function loadNextTicket() {
		if (!currentCounter) return;
		const serviceCode = getServiceCode();
		const waiting = $tickets.filter((t) => t.status === 'waiting' && t.service_code === serviceCode);
		nextTicket = waiting.sort((a, b) => a.number - b.number)[0] || null;
	}
	
	function loadCurrentTicket() {
		if (!currentCounter) return;
		currentTicket = $tickets.find((t) => t.status === 'called' && t.counter_id === currentCounter.id) || null;
	}
	
	onMount(async () => {
		isLoading.set(true);
		try {
			await checkAuth();
			let prof: any = get(userProfile);
			if (!prof && typeof window !== 'undefined') {
				const storedProfile = localStorage.getItem('userProfile');
				if (storedProfile) {
					try {
						prof = JSON.parse(storedProfile);
						userProfile.set(prof);
					} catch {}
				}
			}
			if (!prof || (prof.role !== 'counter_staff' && prof.role !== 'admin')) {
				goto('/login');
				return;
			}
			await Promise.all([fetchServices(), fetchCounters(), fetchTickets(), initializeRealtime()]);
			if (prof?.counter_id) {
				currentCounter = $counters.find((c) => c.id === prof.counter_id);
				loadNextTicket();
				loadCurrentTicket();
			} else {
				const storedActive = typeof window !== 'undefined' ? localStorage.getItem('activeCounterId') : null;
				const fromStorage = storedActive ? $counters.find(c => c.id === storedActive) : null;
				if (fromStorage) {
					selectedCounterId = fromStorage.id;
					currentCounter = fromStorage;
				} else {
					const firstActive = $counters.find(c => c.is_active);
					if (firstActive) {
						selectedCounterId = firstActive.id;
						currentCounter = firstActive;
					}
				}
				loadNextTicket();
				loadCurrentTicket();
			}
			tickets.subscribe(() => {
				loadNextTicket();
				loadCurrentTicket();
			});
		} finally {
			isLoading.set(false);
		}
	});
	
	async function handleCall() {
		if (!nextTicket || !currentCounter || processing) return;
		processing = true;
		try {
			const updated = await callTicket(nextTicket.id, currentCounter.id);
			playTicketSound();
			showOk = true;
			setTimeout(() => (showOk = false), 1500);
			await fetchTickets();
		} catch (e: any) {
			alert(e.message);
		} finally {
			processing = false;
		}
	}
	
	async function handleRecall() {
		const lastCalled = $tickets.find((t) => t.status === 'called' && t.counter_id === currentCounter?.id);
		if (!lastCalled || processing) return;
		processing = true;
		try {
			const result = await recallTicket(lastCalled.id);
			playTicketSound();
			showOk = true;
			setTimeout(() => (showOk = false), 1500);
			await fetchTickets();
		} catch (e: any) {
			alert(e.message);
		} finally {
			processing = false;
		}
	}
	
	async function handleServe() {
		if (!currentTicket || processing) return;
		processing = true;
		try {
			await serveTicket(currentTicket.id);
			showOk = true;
			setTimeout(() => (showOk = false), 1500);
			await fetchTickets();
		} catch (e: any) {
			alert(e.message);
		} finally {
			processing = false;
		}
	}
	
	async function handleSkip() {
		if (!currentTicket || processing) return;
		processing = true;
		try {
			await skipTicket(currentTicket.id);
			showOk = true;
			setTimeout(() => (showOk = false), 1500);
			await fetchTickets();
		} catch (e: any) {
			alert(e.message);
		} finally {
			processing = false;
		}
	}
	
	function openTransfer() {
		if (!currentTicket || processing) return;
		showTransferModal = true;
		selectedTransferCounter = '';
	}
	
	function applyCounterSelection() {
		if (!selectedCounterId) return;
		currentCounter = $counters.find((c) => c.id === selectedCounterId) || null;
		loadNextTicket();
		loadCurrentTicket();
	}
	
	async function confirmTransfer() {
		if (!currentTicket || !selectedTransferCounter || processing) return;
		processing = true;
		try {
			await transferTicket(currentTicket.id, selectedTransferCounter);
			showTransferModal = false;
			selectedTransferCounter = '';
			showOk = true;
			setTimeout(() => (showOk = false), 1500);
			await fetchTickets();
		} catch (e: any) {
			alert(e.message);
		} finally {
			processing = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 p-3">
	{#if !$userProfile?.counter_id}
		<div class="mb-3">
			<div class="flex gap-2">
				<select bind:value={selectedCounterId} class="flex-1 border rounded px-2 py-1 text-sm">
					{#each $counters.filter(c => c.is_active) as counter}
						<option value={counter.id}>{counter.name}</option>
					{/each}
				</select>
				<button on:click={applyCounterSelection} class="px-3 py-1 bg-forest-green text-white rounded text-sm hover:bg-forest-green-600">
					Use
				</button>
			</div>
		</div>
	{/if}

	{#if currentTicket}
		<button on:click={handleServe} class="w-full bg-forest-green text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-forest-green-600 transition-colors shadow-md">
			Complete Service
		</button>
		<div class="grid grid-cols-3 gap-2 mt-2">
			<button on:click={handleRecall} class="bg-yellow-100 text-yellow-800 px-4 py-2 rounded font-semibold hover:bg-yellow-200 transition-colors">
				Recall
			</button>
			<button on:click={handleSkip} class="bg-gray-100 text-gray-700 px-4 py-2 rounded font-semibold hover:bg-gray-200 transition-colors">
				Skip
			</button>
			<button on:click={openTransfer} class="bg-blue-100 text-blue-800 px-4 py-2 rounded font-semibold hover:bg-blue-200 transition-colors">
				Transfer
			</button>
		</div>
	{:else}
		<button
			on:click={handleCall}
			disabled={!nextTicket || processing}
			class="w-full bg-forest-green text-white py-4 rounded-lg font-bold hover:bg-forest-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{processing ? 'Processing...' : (nextTicket ? 'Call Next' : 'No Waiting Tickets')}
		</button>
	{/if}
	
	{#if showOk}
		<div class="fixed bottom-3 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-sm">Done</div>
	{/if}
	
	{#if showTransferModal}
		<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div class="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
				<h3 class="text-xl font-bold mb-4">Transfer Ticket</h3>
				<p class="text-gray-600 mb-4">Select a counter to transfer to:</p>
				<div class="space-y-2 mb-6 max-h-60 overflow-y-auto">
					{#each $counters.filter(c => c.is_active && c.id !== currentCounter?.id) as counter}
						<label class="flex items-center p-3 border rounded cursor-pointer hover:bg-gray-50 {selectedTransferCounter === counter.id ? 'border-forest-green bg-green-50' : ''}">
							<input type="radio" name="transfer-counter" value={counter.id} bind:group={selectedTransferCounter} class="mr-3" />
							<div>
								<div class="font-semibold">{counter.name}</div>
								<div class="text-xs text-gray-500">{$services.find(s => s.id === counter.service_id)?.name}</div>
							</div>
						</label>
					{/each}
					{#if $counters.filter(c => c.is_active && c.id !== currentCounter?.id).length === 0}
						<p class="text-center text-gray-500 py-4">No other active counters available.</p>
					{/if}
				</div>
				<div class="flex justify-end gap-3">
					<button on:click={() => { showTransferModal = false; selectedTransferCounter = ''; }} class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
					<button on:click={confirmTransfer} disabled={!selectedTransferCounter || processing} class="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-50">Confirm Transfer</button>
				</div>
			</div>
		</div>
	{/if}
</div>
