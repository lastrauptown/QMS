<script lang="ts">
	import { onMount } from 'svelte';
	import { services, fetchServices, createTicket } from '$lib/stores/queue';

	let selectedService = '';
	let loading = false;
	let error = '';
	let success = '';
	let ticketNumber = '';

	onMount(async () => {
		await fetchServices();
	});

	async function handleCreateTicket() {
		if (!selectedService) {
			error = 'Please select a service';
			return;
		}

		loading = true;
		error = '';
		success = '';
		ticketNumber = '';

		try {
			const ticket = await createTicket(selectedService);
			ticketNumber = ticket.ticket_number;
			success = 'Ticket created successfully!';
			selectedService = '';
		} catch (e: any) {
			error = e.message || 'Failed to create ticket';
		} finally {
			loading = false;
		}
	}
</script>

	<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	<div class="max-w-md w-full">
		<div class="text-center mb-8">
			<img
				src="/logo-sanpedro.png"
				alt="City of San Pedro, Laguna, Philippines"
				class="mx-auto mb-4 h-24 w-24 object-contain"
			/>
			<h2 class="text-3xl font-bold text-gray-900 mb-2">Get Your Ticket</h2>
			<p class="text-gray-600">City of San Pedro, Laguna</p>
			<p class="text-sm text-gray-500 mt-2">Select a service to get your queue number</p>
		</div>

		<div class="card">
			{#if error}
				<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
					{error}
				</div>
			{/if}

			{#if success}
				<div class="mb-6 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
					<p class="text-green-700 mb-2">{success}</p>
					<div class="text-5xl font-black text-forest-green">{ticketNumber}</div>
					<p class="text-sm text-gray-600 mt-4">
						Please wait for your number to be called. Watch the display screen.
					</p>
				</div>
			{/if}

			<form on:submit|preventDefault={handleCreateTicket} class="space-y-6">
				<div>
					<label for="service" class="block text-sm font-medium text-gray-700 mb-2">
						Select Service
					</label>
					<select
						id="service"
						bind:value={selectedService}
						required
						class="input-field"
						disabled={loading}
					>
						<option value="">Choose a service...</option>
						{#each $services.filter((s) => s.is_active) as service}
							<option value={service.code}>
								{service.name} ({service.code})
							</option>
						{/each}
					</select>
					{#if $services.filter((s) => s.is_active).length === 0}
						<p class="mt-2 text-sm text-gray-500">No active services available</p>
					{/if}
				</div>

				<button
					type="submit"
					disabled={loading || !selectedService}
					class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Creating Ticket...' : 'Get Ticket'}
				</button>
			</form>

			<div class="mt-6 text-center space-y-2">
				<a href="/display" class="block text-forest-green hover:underline">
					View Queue Display
				</a>
				<a href="/help" class="block text-gray-600 hover:underline text-sm">Help & Support</a>
			</div>
		</div>
	</div>
</div>

