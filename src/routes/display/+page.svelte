<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		counters,
		services,
		currentTickets,
		fetchCounters,
		fetchServices,
		fetchTickets,
		initializeRealtime
	} from '$lib/stores/queue';
	import { playTicketSound, initAudio } from '$lib/stores/sound';
	import { isLoading } from '$lib/stores/ui';

	let previousTickets = new Map();
	let activeAnnouncements = new Map<string, AbortController>();
	let flashingCounters = new Set<string>();
	let videoElement: HTMLVideoElement;
	let hasInteracted = false;
	let currentVideoUrl = '/BOYSEN Celso Episode 1 Celso - BOYSEN Paints (720p, h264).mp4'; // Default fallback
	let retryInterval: any;
	let settingsInterval: any;
	let debugError = '';
	let mounted = false;

	// Text-to-Speech Announcement
	function announceTicket(ticketNumber: string, counterName: string): Promise<void> {
		return new Promise((resolve) => {
			console.log(`TTS Attempt: Ticket ${ticketNumber} -> ${counterName}, Has Interacted: ${hasInteracted}`);
			
			if (!hasInteracted) {
				console.warn('TTS blocked: No interaction yet');
				resolve();
				return;
			}
			
			// Cancel any ongoing speech
			window.speechSynthesis.cancel();
			
			const text = `Ticket number ${ticketNumber}, please proceed to ${counterName}`;
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.rate = 0.85; // Slightly slower for clarity
			utterance.pitch = 1;
			
			// Try to use a better voice if available
			const voices = window.speechSynthesis.getVoices();
			const preferredVoice = voices.find(v => v.lang.includes('en') && !v.name.includes('Google'));
			if (preferredVoice) utterance.voice = preferredVoice;

			utterance.onend = () => resolve();
			utterance.onerror = (e) => {
				console.error('TTS Error:', e);
				resolve();
			};
			
			window.speechSynthesis.speak(utterance);
		});
	}

	function handleInteraction() {
		hasInteracted = true;
		console.log('Interaction detected, enabling audio');
		initAudio();
		
		if (videoElement) {
			videoElement.muted = false;
			// Ensure it's playing (in case autoplay failed or was paused)
			videoElement.play().catch(console.error);
		}
	}

	onMount(async () => {
		mounted = true;
		isLoading.set(true);
		
		// Attempt to auto-enable sound
		try {
			await initAudio();
			if (videoElement) {
				videoElement.muted = false;
				await videoElement.play();
				// If autoplay succeeded, we can allow TTS immediately
				hasInteracted = true;
			}
		} catch (e) {
			console.log("Autoplay with sound failed (browser policy), waiting for interaction");
			hasInteracted = false;
			if (videoElement) videoElement.muted = true;
		}

		// Initial data fetch - we do this individually to prevent one failure from blocking others
		try { await fetchServices(); } catch (e) { console.error('Error fetching services:', e); }
		
		try { 
			await fetchCounters(); 
		} catch (e: any) { 
			console.error('Error fetching counters:', e); 
			debugError = e.message || JSON.stringify(e);
		}
		
		// Always start the retry interval if counters are empty, regardless of fetch error
		if ($counters.length === 0) {
			console.log('Counters empty or fetch failed, starting retry interval...');
			retryInterval = setInterval(async () => {
				if ($counters.length > 0) {
					clearInterval(retryInterval);
					console.log('Counters loaded, stopping retry.');
					debugError = '';
				} else {
					console.log('Retrying fetchCounters...');
					try { 
						await fetchCounters(); 
						debugError = '';
					} catch (e: any) { 
						console.error('Retry failed:', e);
						debugError = e.message || JSON.stringify(e);
					}
				}
			}, 3000);
		}

		try { await fetchTickets(); } catch (e) { console.error('Error fetching tickets:', e); }
		try { await initializeRealtime(); } catch (e) { console.error('Error initializing realtime:', e); }
		try { await fetchSettings(); } catch (e) { console.error('Error fetching settings:', e); }

		// Poll for settings (video URL) updates every 30 seconds
		settingsInterval = setInterval(fetchSettings, 30000);

		currentTickets.subscribe((tickets) => {
			// Clean up flashing for removed tickets
			flashingCounters.forEach(counterId => {
				if (!tickets.has(counterId)) {
					flashingCounters.delete(counterId);
					flashingCounters = flashingCounters;
				}
			});

			tickets.forEach((ticket, counterId) => {
				const prevTicket = previousTickets.get(counterId);
				
				// Trigger if ticket changed OR if it was re-called (updated_at/called_at changed)
				// We track ticket_number + called_at + updated_at combination to detect re-calls
				const prevKey = prevTicket ? `${prevTicket.ticket_number}-${prevTicket.called_at}-${prevTicket.updated_at || ''}` : '';
				const currentKey = `${ticket.ticket_number}-${ticket.called_at}-${ticket.updated_at || ''}`;
				
				const isNewCall = prevKey !== currentKey;
				const isCalledStatus = ticket.status === 'called';

				if (isNewCall && isCalledStatus) {
					console.log(`Announcing ticket: ${ticket.ticket_number} at ${counterId}`);
					triggerFlash(counterId);
					
					// Play sound and announce 3 times
					const counter = $counters.find(c => c.id === counterId);
					
					// Abort previous announcement for this counter
					if (activeAnnouncements.has(counterId)) {
						activeAnnouncements.get(counterId)?.abort();
					}
					const controller = new AbortController();
					activeAnnouncements.set(counterId, controller);
					
					(async () => {
						try {
							for (let i = 0; i < 3; i++) {
								if (controller.signal.aborted) break;
								playTicketSound();
								await new Promise(r => setTimeout(r, 1500)); // Wait for chime
								
								if (controller.signal.aborted) break;
								
								if (counter) {
									await announceTicket(ticket.ticket_number, counter.name);
									await new Promise(r => setTimeout(r, 500)); // Gap between repeats
								}
							}
						} finally {
							if (activeAnnouncements.get(counterId) === controller) {
								activeAnnouncements.delete(counterId);
							}
						}
					})();
				}
			});
			previousTickets = new Map(tickets);
		});

		isLoading.set(false);
	});

	async function fetchSettings() {
		try {
			const response = await fetch('/api/settings?key=display_video_url');
			if (response.ok) {
				const data = await response.json();
				if (data.value && data.value !== currentVideoUrl) {
					console.log('Video updated:', data.value);
					currentVideoUrl = data.value;
				}
			}
		} catch (error) {
			console.error('Error fetching settings:', error);
		}
	}

	function triggerFlash(counterId: string) {
		flashingCounters.add(counterId);
		flashingCounters = flashingCounters; // update store/reactivity
		setTimeout(() => {
			flashingCounters.delete(counterId);
			flashingCounters = flashingCounters;
		}, 3000); // Flash for 3 seconds
	}

	onDestroy(() => {
		if (retryInterval) clearInterval(retryInterval);
		if (settingsInterval) clearInterval(settingsInterval);
		activeAnnouncements.forEach(c => c.abort());
	});

	function getCurrentTicket(counterId: string): string {
		const ticket = $currentTickets.get(counterId);
		return ticket?.ticket_number || '---';
	}

	function getCounterService(counterId: string) {
		const counter = $counters.find((c) => c.id === counterId);
		if (!counter) return null;
		return $services.find((s) => s.id === counter.service_id);
	}
</script>

<div class="min-h-screen bg-white">
	<!-- Header -->
	<header class="bg-forest-green text-white px-6 py-4 shadow-lg shrink-0 z-20 relative">
		<div class="flex items-center justify-between">
			<div class="flex items-center space-x-6">
				<img
					src="/logo-sanpedro.png"
					alt="City of San Pedro, Laguna, Philippines"
					class="h-20 w-20 object-contain drop-shadow-md"
				/>
				<div>
					<h1 class="text-4xl font-black tracking-tight uppercase">Queue Management System</h1>
					<p class="text-xl text-white/90 font-medium">City of San Pedro, Laguna, Philippines</p>
				</div>
			</div>
			<div class="text-right">
				<p class="text-xs text-white/60 font-medium">Developed by</p>
				<p class="text-sm font-bold text-white/90">Mark Joshua Punzalan OJT</p>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-grow flex gap-6 p-6 h-[calc(100vh-128px)] overflow-hidden bg-gray-100">
		<!-- Left Side: Queue Status -->
		<div class="w-5/12 flex flex-col h-full">
			<!-- Header Card -->
			<div class="mb-4 bg-white p-6 rounded-2xl shadow-sm border-l-8 border-forest-green shrink-0">
				<h2 class="text-5xl font-black text-gray-900 mb-2 uppercase tracking-tight">Now Serving</h2>
				<p class="text-gray-600 text-xl font-medium">Please proceed to the counter</p>
			</div>

			<!-- Counters List -->
			<div class="flex-grow flex flex-col gap-3 overflow-y-auto scrollbar-hide pb-2">
				{#each $counters as counter}
					{@const service = getCounterService(counter.id)}
					<div class="card bg-white rounded-xl p-4 shadow-sm border-l-8 flex flex-col justify-center transition-all duration-500 shrink-0 {counter.is_active ? 'border-forest-green' : 'border-gray-300 opacity-70'} {flashingCounters.has(counter.id) ? 'bg-yellow-50 border-yellow-500 shadow-yellow-200 shadow-2xl scale-105 z-10' : ''}">
						<div class="flex items-center justify-between">
							<div class="w-7/12 overflow-hidden">
								<h3 class="text-2xl font-bold text-gray-800 mb-0.5 leading-tight truncate">
									{counter.name}
								</h3>
								{#if service}
									<p class="text-lg text-gray-600 font-medium truncate">{service.name}</p>
								{/if}
								{#if !counter.is_active}
									<span class="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wider">Closed</span>
								{/if}
							</div>
							
							<div class="w-5/12 text-right">
								<p class="text-xs text-gray-400 mb-0 uppercase tracking-widest font-bold">TICKET NO.</p>
								<div class="text-6xl leading-none font-black tracking-tighter transition-all duration-300 {flashingCounters.has(counter.id) ? 'text-red-600 scale-110' : (counter.is_active ? 'text-forest-green' : 'text-gray-300')}">
									{counter.is_active ? getCurrentTicket(counter.id) : '---'}
								</div>
							</div>
						</div>
					</div>
				{/each}
				
				{#if $counters.length === 0}
					<div class="flex-grow flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
						<p class="text-gray-400 text-2xl font-medium italic mb-4">No counters configured</p>
						<div class="flex flex-col gap-2 w-full max-w-md">
							<p class="text-sm text-gray-500 animate-pulse">Attempting to connect to server...</p>
							{#if debugError}
								<div class="text-xs text-red-500 font-mono bg-red-50 p-2 rounded text-left overflow-auto max-h-32">
									<strong>Error:</strong> {debugError}
								</div>
							{/if}
							
							<!-- Connectivity Debugger -->
							{#if mounted}
								{#await fetch('/api/debug').then(r => r.json())}
									<p class="text-xs text-blue-400">Checking server environment...</p>
								{:then env}
									<div class="text-xs text-gray-400 font-mono text-left bg-gray-50 p-2 rounded">
										<p>Server Env: {env.service_role_exists ? 'OK' : 'MISSING KEY'}</p>
										<p>Public URL: {env.public_url_exists ? 'OK' : 'MISSING'}</p>
									</div>
								{:catch e}
									<p class="text-xs text-red-400">Server check failed: {e.message}</p>
								{/await}

								{#await fetch('/api/counters?t=' + Date.now()).then(r => r.json())}
									<p class="text-xs text-blue-400">Testing API...</p>
								{:then apiRes}
									<div class="text-xs text-gray-400 font-mono text-left bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-32">
										<p>API Status: {apiRes.error ? 'ERROR' : 'OK'}</p>
										<p>Counters: {apiRes.counters ? apiRes.counters.length : 'N/A'}</p>
										{#if apiRes.error}
											<p class="text-red-500">{apiRes.error}</p>
										{/if}
									</div>
								{:catch e}
									<p class="text-xs text-red-400">API fetch failed: {e.message}</p>
								{/await}
							{/if}

							<p class="text-xs text-gray-400 mt-2">Counters: {$counters.length}</p>
							<div class="flex gap-2 justify-center mt-2">
								<button 
									class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded transition-colors"
									on:click={() => window.location.reload()}
								>
									Reload Page
								</button>
								<button 
									class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs rounded transition-colors"
									on:click={() => {
										localStorage.clear();
										window.location.reload();
									}}
								>
									Reset Data
								</button>
							</div>
							<p class="text-xs text-red-400 mt-2">If this persists, please restart the server.</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Right Side: Video -->
		<div class="w-7/12 bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 relative h-full">
			{#if !hasInteracted}
				<div 
					class="absolute inset-0 z-10 flex items-center justify-center bg-black/60 cursor-pointer hover:bg-black/50 transition-colors"
					on:click={handleInteraction}
					on:keydown={(e) => e.key === 'Enter' && handleInteraction()}
					role="button"
					tabindex="0"
				>
					<div class="text-center text-white p-6 rounded-xl bg-black/40 backdrop-blur-sm">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
						</svg>
						<p class="text-xl font-bold">Click to Enable Sound</p>
					</div>
				</div>
			{/if}
			<div class="absolute bottom-4 right-4 z-20 flex gap-2">
				<button 
					class="bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
					on:click={() => {
						if (videoElement) {
							videoElement.muted = !videoElement.muted;
						}
					}}
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						{#if videoElement && videoElement.muted}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
						{/if}
					</svg>
				</button>
			</div>
			<!-- svelte-ignore a11y-media-has-caption -->
			<video
				bind:this={videoElement}
				src={currentVideoUrl}
				class="w-full h-full object-cover"
				autoplay
				loop
				muted
				playsinline
			></video>
		</div>
	</main>
</div>

<style>
	:global(body) {
		overflow: hidden;
	}
	
	/* Hide scrollbar for Chrome, Safari and Opera */
	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}

	/* Hide scrollbar for IE, Edge and Firefox */
	.scrollbar-hide {
		-ms-overflow-style: none;  /* IE and Edge */
		scrollbar-width: none;  /* Firefox */
	}

	.bg-forest-green {
		background-color: #2e7d32;
	}
	.border-forest-green {
		border-color: #2e7d32;
	}
	.text-forest-green {
		color: #2e7d32;
	}
</style>
