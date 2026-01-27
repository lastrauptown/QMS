<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { userProfile, signOut, checkAuth } from '$lib/stores/auth';
	import {
		services,
		counters,
		tickets,
		currentTickets,
		fetchServices,
		fetchCounters,
		fetchTickets,
		initializeRealtime,
		getAllCounterStats,
		getServiceStats,
		calculateServiceTime,
		calculateWaitTime
	} from '$lib/stores/queue';
	import { supabase } from '$lib/supabase';
	import { showSuccess, showError, showWarning, showInfo } from '$lib/stores/toast';

	let activeTab = 'services';
	let showServiceModal = false;
	let showCounterModal = false;
	let showUserModal = false;
	let showConfirmDialog = false;
	let confirmAction: (() => void) | null = null;
	let confirmMessage = '';
	let editingService: any = null;
	let editingCounter: any = null;
	let editingUser: any = null;
	let serviceForm = { code: '', name: '', description: '', is_active: true };
	let counterForm = { name: '', service_id: '', is_active: true };
	let userForm = { email: '', password: '', name: '', role: 'counter_staff', counter_id: '', auth_user_id: '' };
	let allUsers: any[] = [];
	let ticketFilter = { status: '', counter: '', service: '', date: '' };
	
	// Loading states
	let loading = {
		service: false,
		counter: false,
		user: false,
		delete: false,
		reset: false
	};
	
	// Form errors
	let formErrors = {
		service: {} as Record<string, string>,
		counter: {} as Record<string, string>,
		user: {} as Record<string, string>
	};

	let stats = {
		totalServed: 0,
		avgWaitTime: 0,
		activeCounters: 0,
		busiestHour: ''
	};
	let counterStatsMap = new Map();
	let serviceStatsList: any[] = [];
	
	// Settings
	let currentVideoUrl = '';
	let videoFile: File | null = null;
	let isUploading = false;
	let videoList: any[] = [];
	let loadingVideo = false;

	onMount(async () => {
		if (!$userProfile) {
			await checkAuth();
		}

		if (!$userProfile || $userProfile.role !== 'admin') {
			goto('/login');
			return;
		}

		await fetchServices();
		await fetchCounters();
		await fetchTickets();
		await initializeRealtime();
		await loadStats();
		await fetchUsers();
		await fetchSettings();
		await fetchVideos();
	});

	async function fetchSettings() {
		try {
			const { data, error } = await supabase
				.from('app_settings')
				.select('value')
				.eq('key', 'display_video_url')
				.single();
			
			if (data) {
				currentVideoUrl = data.value;
			}
		} catch (error) {
			console.error('Error fetching settings:', error);
		}
	}

	async function fetchVideos() {
		try {
			const { data, error } = await supabase
				.storage
				.from('videos')
				.list();
			
			if (error) throw error;
			videoList = data || [];
		} catch (error) {
			console.error('Error fetching videos:', error);
			showError('Failed to load video list');
		}
	}

	async function selectVideo(fileName: string) {
		loadingVideo = true;
		try {
			const { data: { publicUrl } } = supabase.storage
				.from('videos')
				.getPublicUrl(fileName);

			const { error } = await supabase
				.from('app_settings')
				.upsert({ 
					key: 'display_video_url', 
					value: publicUrl,
					updated_at: new Date().toISOString()
				});

			if (error) throw error;

			currentVideoUrl = publicUrl;
			showSuccess('Display video updated');
		} catch (error: any) {
			showError(error.message || 'Failed to update video');
		} finally {
			loadingVideo = false;
		}
	}

	async function deleteVideo(fileName: string) {
		confirmDelete(async () => {
			const { error } = await supabase.storage
				.from('videos')
				.remove([fileName]);

			if (error) throw error;
			
			showSuccess('Video deleted successfully');
			await fetchVideos();
		}, 'Are you sure you want to delete this video?');
	}

	function handleFileSelect(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			videoFile = target.files[0];
		}
	}

	async function handleVideoUpload() {
		if (!videoFile) {
			showError('Please select a video file');
			return;
		}
		
		isUploading = true;
		try {
			const fileExt = videoFile.name.split('.').pop();
			const fileName = `display-video-${Date.now()}.${fileExt}`;
			
			const { error: uploadError } = await supabase.storage
				.from('videos')
				.upload(fileName, videoFile);

			if (uploadError) throw uploadError;

			showSuccess('Video uploaded successfully');
			videoFile = null;
			// Reset file input
			const fileInput = document.getElementById('video-upload') as HTMLInputElement;
			if (fileInput) fileInput.value = '';
			
			await fetchVideos();
		} catch (error: any) {
			console.error('Upload error:', error);
			showError(error.message || 'Failed to upload video');
		} finally {
			isUploading = false;
		}
	}

	async function loadStats() {
		const served = $tickets.filter((t) => t.status === 'served');
		stats.totalServed = served.length;

		if (served.length > 0) {
			const waitTimes = served
				.filter((t) => t.called_at && t.created_at)
				.map((t) => {
					const created = new Date(t.created_at).getTime();
					const called = new Date(t.called_at!).getTime();
					return (called - created) / 1000 / 60; // minutes
				});
			stats.avgWaitTime =
				waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length || 0;
		}

		stats.activeCounters = $counters.filter((c) => c.is_active).length;

		const hourCounts: Record<number, number> = {};
		$tickets
			.filter((t) => t.called_at)
			.forEach((t) => {
				const hour = new Date(t.called_at!).getHours();
				hourCounts[hour] = (hourCounts[hour] || 0) + 1;
			});

		const busiest = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
		stats.busiestHour = busiest ? `${busiest[0]}:00` : 'N/A';
	}

	function validateServiceForm() {
		formErrors.service = {};
		if (!serviceForm.code?.trim()) {
			formErrors.service.code = 'Service code is required';
		} else if (serviceForm.code.length > 10) {
			formErrors.service.code = 'Code must be 10 characters or less';
		}
		if (!serviceForm.name?.trim()) {
			formErrors.service.name = 'Service name is required';
		}
		return Object.keys(formErrors.service).length === 0;
	}

	async function saveService() {
		if (!validateServiceForm()) {
			showError('Please fix the form errors');
			return;
		}

		loading.service = true;
		try {
			if (editingService) {
				const { error } = await supabase
					.from('services')
					.update(serviceForm)
					.eq('id', editingService.id);
				
				if (error) throw error;
				showSuccess('Service updated successfully');
			} else {
				// Check if code already exists
				const { data: existing } = await supabase
					.from('services')
					.select('id')
					.eq('code', serviceForm.code.trim().toUpperCase())
					.single();
				
				if (existing) {
					formErrors.service.code = 'This service code already exists';
					loading.service = false;
					showError('Service code already exists');
					return;
				}

				const { error } = await supabase.from('services').insert({
					...serviceForm,
					code: serviceForm.code.trim().toUpperCase()
				});
				
				if (error) throw error;
				showSuccess('Service created successfully');
			}
			await fetchServices();
			closeServiceModal();
		} catch (error: any) {
			console.error('Error saving service:', error);
			showError(error.message || 'Failed to save service');
		} finally {
			loading.service = false;
		}
	}

	function closeServiceModal() {
		showServiceModal = false;
		editingService = null;
		serviceForm = { code: '', name: '', description: '', is_active: true };
		formErrors.service = {};
	}

	function validateCounterForm() {
		formErrors.counter = {};
		if (!counterForm.name?.trim()) {
			formErrors.counter.name = 'Counter name is required';
		}
		if (!counterForm.service_id) {
			formErrors.counter.service_id = 'Please select a service';
		}
		return Object.keys(formErrors.counter).length === 0;
	}

	async function saveCounter() {
		if (!validateCounterForm()) {
			showError('Please fix the form errors');
			return;
		}

		loading.counter = true;
		try {
			if (editingCounter) {
				const { error } = await supabase
					.from('counters')
					.update(counterForm)
					.eq('id', editingCounter.id);
				
				if (error) throw error;
				showSuccess('Counter updated successfully');
			} else {
				const { error } = await supabase.from('counters').insert(counterForm);
				
				if (error) throw error;
				showSuccess('Counter created successfully');
			}
			await fetchCounters();
			closeCounterModal();
		} catch (error: any) {
			console.error('Error saving counter:', error);
			showError(error.message || 'Failed to save counter');
		} finally {
			loading.counter = false;
		}
	}

	function closeCounterModal() {
		showCounterModal = false;
		editingCounter = null;
		counterForm = { name: '', service_id: '', is_active: true };
		formErrors.counter = {};
	}

	function editService(service: any) {
		editingService = service;
		serviceForm = { ...service };
		formErrors.service = {};
		showServiceModal = true;
	}

	function editCounter(counter: any) {
		editingCounter = counter;
		counterForm = { ...counter };
		formErrors.counter = {};
		showCounterModal = true;
	}

	function confirmDelete(action: () => void, message: string) {
		confirmAction = action;
		confirmMessage = message;
		showConfirmDialog = true;
	}

	async function executeConfirm() {
		if (confirmAction) {
			try {
				await confirmAction();
				if (!loading.reset) {
					showSuccess('Operation completed successfully');
				}
			} catch (error: any) {
				showError(error.message || 'Operation failed');
			} finally {
				showConfirmDialog = false;
				confirmAction = null;
			}
		}
	}

	async function deleteService(id: string) {
		const service = $services.find(s => s.id === id);
		const serviceCounters = $counters.filter(c => c.service_id === id);
		
		if (serviceCounters.length > 0) {
			showWarning(`Cannot delete service "${service?.name}". It has ${serviceCounters.length} counter(s) assigned. Please reassign or delete the counters first.`);
			return;
		}

		confirmDelete(async () => {
			const { error } = await supabase.from('services').delete().eq('id', id);
			if (error) throw error;
			await fetchServices();
		}, `Are you sure you want to delete "${service?.name}"? This action cannot be undone.`);
	}

	async function deleteCounter(id: string) {
		const counter = $counters.find(c => c.id === id);
		const counterTickets = $tickets.filter(t => t.counter_id === id && t.status !== 'served');
		
		if (counterTickets.length > 0) {
			showWarning(`Cannot delete counter "${counter?.name}". It has ${counterTickets.length} active ticket(s). Please serve or clear the tickets first.`);
			return;
		}

		confirmDelete(async () => {
			const { error } = await supabase.from('counters').delete().eq('id', id);
			if (error) throw error;
			await fetchCounters();
		}, `Are you sure you want to delete "${counter?.name}"? This action cannot be undone.`);
	}

	async function resetDailyQueue() {
		const todayTickets = $tickets.filter(t => 
			t.created_at.startsWith(new Date().toISOString().split('T')[0])
		);
		
		if (todayTickets.length === 0) {
			showWarning('No tickets to reset for today');
			return;
		}

		loading.reset = true;
		confirmDelete(async () => {
			const { error } = await supabase
				.from('tickets')
				.delete()
				.gte('created_at', new Date().toISOString().split('T')[0]);
			if (error) throw error;
			await fetchTickets();
			await loadStats();
			loading.reset = false;
		}, `Are you sure you want to reset today's queue? This will delete ${todayTickets.length} ticket(s). This action cannot be undone.`);
	}

	async function handleLogout() {
		await signOut();
		goto('/login');
	}

	async function fetchUsers() {
		const { data, error } = await supabase
			.from('user_profiles')
			.select('*')
			.order('created_at', { ascending: false });
		
		if (error) {
			console.error('Error fetching users:', error);
			return;
		}
		allUsers = data || [];
	}

	function validateUserForm() {
		formErrors.user = {};
		if (!userForm.email?.trim()) {
			formErrors.user.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
			formErrors.user.email = 'Please enter a valid email address';
		}
		if (!editingUser && !userForm.password) {
			formErrors.user.password = 'Password is required';
		} else if (!editingUser && userForm.password.length < 6) {
			formErrors.user.password = 'Password must be at least 6 characters';
		}
		if (userForm.role === 'counter_staff' && !userForm.counter_id) {
			formErrors.user.counter_id = 'Please assign a counter for counter staff';
		}
		return Object.keys(formErrors.user).length === 0;
	}

	async function saveUser() {
		if (!validateUserForm()) {
			showError('Please fix the form errors');
			return;
		}

		loading.user = true;
		try {
			if (editingUser) {
				const { error } = await supabase
					.from('user_profiles')
					.update({
						name: userForm.name || null,
						role: userForm.role,
						counter_id: userForm.counter_id || null
					})
					.eq('id', editingUser.id);
				
				if (error) throw error;
				showSuccess('User updated successfully');
			} else {
				const response = await fetch('/api/users/create', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						email: userForm.email.trim(),
						password: userForm.password,
						name: userForm.name?.trim() || null,
						role: userForm.role,
						counter_id: userForm.counter_id || null
					})
				});

				const result = await response.json();

				if (!response.ok) {
					throw new Error(result.error || 'Failed to create user');
				}
				showSuccess('User created successfully');
			}
			await fetchUsers();
			closeUserModal();
		} catch (error: any) {
			console.error('Error saving user:', error);
			showError(error.message || 'Failed to save user');
		} finally {
			loading.user = false;
		}
	}

	function closeUserModal() {
		showUserModal = false;
		editingUser = null;
		userForm = { email: '', password: '', name: '', role: 'counter_staff', counter_id: '', auth_user_id: '' };
		formErrors.user = {};
	}

	function editUser(user: any) {
		editingUser = user;
		userForm = {
			email: user.email,
			password: '', // Don't show password when editing
			name: user.name || '',
			role: user.role,
			counter_id: user.counter_id || '',
			auth_user_id: user.id
		};
		formErrors.user = {};
		showUserModal = true;
	}

	async function deleteUser(id: string) {
		const user = allUsers.find(u => u.id === id);
		if (user?.id === $userProfile?.id) {
			showError('You cannot delete your own account');
			return;
		}

		confirmDelete(async () => {
			const { error } = await supabase.from('user_profiles').delete().eq('id', id);
			if (error) throw error;
			await fetchUsers();
		}, `Are you sure you want to delete user "${user?.email}"? This will also delete their authentication account. This action cannot be undone.`);
	}

	function getFilteredTickets() {
		let filtered = $tickets;
		
		if (ticketFilter.status) {
			filtered = filtered.filter((t) => t.status === ticketFilter.status);
		}
		if (ticketFilter.counter) {
			filtered = filtered.filter((t) => t.counter_id === ticketFilter.counter);
		}
		if (ticketFilter.service) {
			filtered = filtered.filter((t) => t.service_code === ticketFilter.service);
		}
		if (ticketFilter.date) {
			const dateStr = ticketFilter.date;
			filtered = filtered.filter((t) => t.created_at.startsWith(dateStr));
		}
		
		return filtered.slice(0, 100); // Limit to 100 for performance
	}

	function exportTickets() {
		const filtered = getFilteredTickets();
		if (filtered.length === 0) {
			showWarning('No tickets to export');
			return;
		}
		
		const csv = [
			['Ticket Number', 'Service', 'Status', 'Counter', 'Created At', 'Called At', 'Served At'].join(','),
			...filtered.map((t) => {
				const counter = $counters.find((c) => c.id === t.counter_id);
				return [
					`"${t.ticket_number}"`,
					`"${t.service_code}"`,
					`"${t.status}"`,
					`"${counter?.name || '-'}"`,
					`"${t.created_at}"`,
					`"${t.called_at || '-'}"`,
					`"${t.served_at || '-'}"`
				].join(',');
			})
		].join('\n');
		
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showSuccess(`Exported ${filtered.length} ticket(s)`);
	}

	// Handle ESC key to close modals
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (showServiceModal) closeServiceModal();
			if (showCounterModal) closeCounterModal();
			if (showUserModal) closeUserModal();
			if (showConfirmDialog) {
				showConfirmDialog = false;
				confirmAction = null;
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	$: if ($tickets.length > 0) {
		loadStats();
		counterStatsMap = getAllCounterStats($counters, $tickets);
		serviceStatsList = $services.map((s) => getServiceStats(s.code, $tickets, $services));
	}
</script>

{#if !$userProfile || $userProfile.role !== 'admin'}
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
						<h1 class="text-xl font-bold">Admin Dashboard</h1>
						<p class="text-xs text-white/80">City of San Pedro, Laguna</p>
					</div>
				</div>
				<button on:click={handleLogout} class="text-sm hover:underline">Logout</button>
			</div>
		</header>

		<main class="px-8 py-8 max-w-7xl mx-auto">
			<!-- Tabs -->
			<div class="flex space-x-4 mb-8 border-b overflow-x-auto">
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'services'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'services')}
				>
					Services
				</button>
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'counters'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'counters')}
				>
					Counters
				</button>
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'tickets'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'tickets')}
				>
					Tickets
				</button>
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'analytics'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'analytics')}
				>
					Analytics
				</button>
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'monitoring'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'monitoring')}
				>
					Monitoring
				</button>
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'users'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'users')}
				>
					Users
				</button>
				<button
					class="px-4 py-2 font-semibold whitespace-nowrap {activeTab === 'settings'
						? 'text-forest-green border-b-2 border-forest-green'
						: 'text-gray-600'}"
					on:click={() => (activeTab = 'settings')}
				>
					Settings
				</button>
			</div>

			<!-- Services Tab -->
			{#if activeTab === 'services'}
				<div class="card">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold">Services</h2>
						<button
							on:click={() => {
								editingService = null;
								serviceForm = { code: '', name: '', description: '', is_active: true };
								showServiceModal = true;
							}}
							class="btn-primary"
						>
							Add Service
						</button>
					</div>

					{#if $services.length === 0}
						<div class="text-center py-12 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							<p class="text-lg font-medium">No services yet</p>
							<p class="text-sm mt-2">Get started by adding your first service</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b">
										<th class="text-left py-3 px-4">Code</th>
										<th class="text-left py-3 px-4">Name</th>
										<th class="text-left py-3 px-4">Description</th>
										<th class="text-left py-3 px-4">Status</th>
										<th class="text-left py-3 px-4">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each $services as service}
										<tr class="border-b hover:bg-gray-50">
											<td class="py-3 px-4 font-semibold">{service.code}</td>
											<td class="py-3 px-4">{service.name}</td>
											<td class="py-3 px-4 text-gray-600">{service.description || '-'}</td>
											<td class="py-3 px-4">
												<span
													class="px-2 py-1 rounded text-sm {service.is_active
														? 'bg-green-100 text-green-800'
														: 'bg-gray-100 text-gray-800'}"
												>
													{service.is_active ? 'Active' : 'Inactive'}
												</span>
											</td>
											<td class="py-3 px-4">
												<button
													on:click={() => editService(service)}
													class="text-forest-green hover:underline mr-4 disabled:opacity-50"
													disabled={loading.delete}
												>
													Edit
												</button>
												<button
													on:click={() => deleteService(service.id)}
													class="text-red-600 hover:underline disabled:opacity-50"
													disabled={loading.delete}
												>
													Delete
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Counters Tab -->
			{#if activeTab === 'counters'}
				<div class="card">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold">Counters</h2>
						<button
							on:click={() => {
								editingCounter = null;
								counterForm = { name: '', service_id: '', is_active: true };
								showCounterModal = true;
							}}
							class="btn-primary"
						>
							Add Counter
						</button>
					</div>

					{#if $counters.length === 0}
						<div class="text-center py-12 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
							<p class="text-lg font-medium">No counters yet</p>
							<p class="text-sm mt-2">Get started by adding your first counter</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b">
										<th class="text-left py-3 px-4">Name</th>
										<th class="text-left py-3 px-4">Service</th>
										<th class="text-left py-3 px-4">Status</th>
										<th class="text-left py-3 px-4">Current Ticket</th>
										<th class="text-left py-3 px-4">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each $counters as counter}
										{@const service = $services.find((s) => s.id === counter.service_id)}
										{@const activeTicket = $currentTickets.get(counter.id)}
										<tr class="border-b hover:bg-gray-50">
											<td class="py-3 px-4 font-semibold">{counter.name}</td>
											<td class="py-3 px-4">{service?.name || '-'}</td>
											<td class="py-3 px-4">
												<span
													class="px-2 py-1 rounded text-sm {counter.is_active
														? 'bg-green-100 text-green-800'
														: 'bg-gray-100 text-gray-800'}"
												>
													{counter.is_active ? 'Active' : 'Inactive'}
												</span>
											</td>
											<td class="py-3 px-4 font-bold">
												{activeTicket ? activeTicket.ticket_number : (counter.current_ticket || '-')}
											</td>
											<td class="py-3 px-4">
												<button
													on:click={() => editCounter(counter)}
													class="text-forest-green hover:underline mr-4 disabled:opacity-50"
													disabled={loading.delete}
												>
													Edit
												</button>
												<button
													on:click={() => deleteCounter(counter.id)}
													class="text-red-600 hover:underline disabled:opacity-50"
													disabled={loading.delete}
												>
													Delete
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Tickets Tab -->
			{#if activeTab === 'tickets'}
				<div class="card">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold">All Tickets</h2>
						<button on:click={exportTickets} class="btn-secondary">
							Export CSV
						</button>
					</div>

					<!-- Filters -->
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
						<div>
							<label for="filter_status" class="block text-sm font-medium mb-2">Status</label>
							<select id="filter_status" bind:value={ticketFilter.status} class="input-field">
								<option value="">All Status</option>
								<option value="waiting">Waiting</option>
								<option value="called">Called</option>
								<option value="served">Served</option>
								<option value="skipped">Skipped</option>
							</select>
						</div>
						<div>
							<label for="filter_counter" class="block text-sm font-medium mb-2">Counter</label>
							<select id="filter_counter" bind:value={ticketFilter.counter} class="input-field">
								<option value="">All Counters</option>
								{#each $counters as counter}
									<option value={counter.id}>{counter.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="filter_service" class="block text-sm font-medium mb-2">Service</label>
							<select id="filter_service" bind:value={ticketFilter.service} class="input-field">
								<option value="">All Services</option>
								{#each $services as service}
									<option value={service.code}>{service.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="filter_date" class="block text-sm font-medium mb-2">Date</label>
							<input
								id="filter_date"
								type="date"
								bind:value={ticketFilter.date}
								class="input-field"
							/>
						</div>
					</div>

					{#if getFilteredTickets().length === 0}
						<div class="text-center py-12 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
							<p class="text-lg font-medium">No tickets found</p>
							<p class="text-sm mt-2">Try adjusting your filters</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b">
										<th class="text-left py-3 px-4">Ticket</th>
										<th class="text-left py-3 px-4">Service</th>
										<th class="text-left py-3 px-4">Status</th>
										<th class="text-left py-3 px-4">Counter</th>
										<th class="text-left py-3 px-4">Created</th>
										<th class="text-left py-3 px-4">Called</th>
										<th class="text-left py-3 px-4">Served</th>
									</tr>
								</thead>
								<tbody>
									{#each getFilteredTickets() as ticket}
										{@const counter = $counters.find((c) => c.id === ticket.counter_id)}
										<tr class="border-b hover:bg-gray-50">
											<td class="py-3 px-4 font-semibold">{ticket.ticket_number}</td>
											<td class="py-3 px-4">{ticket.service_code}</td>
											<td class="py-3 px-4">
												<span
													class="px-2 py-1 rounded text-sm {ticket.status === 'served'
														? 'bg-green-100 text-green-800'
														: ticket.status === 'called'
															? 'bg-blue-100 text-blue-800'
															: ticket.status === 'waiting'
																? 'bg-yellow-100 text-yellow-800'
																: 'bg-gray-100 text-gray-800'}"
												>
													{ticket.status}
												</span>
											</td>
											<td class="py-3 px-4">{counter?.name || '-'}</td>
											<td class="py-3 px-4 text-sm text-gray-600">
												{new Date(ticket.created_at).toLocaleString()}
											</td>
											<td class="py-3 px-4 text-sm text-gray-600">
												{ticket.called_at ? new Date(ticket.called_at).toLocaleString() : '-'}
											</td>
											<td class="py-3 px-4 text-sm text-gray-600">
												{ticket.served_at ? new Date(ticket.served_at).toLocaleString() : '-'}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Analytics Tab -->
			{#if activeTab === 'analytics'}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div class="card">
						<p class="text-gray-600 mb-2">Total Served</p>
						<p class="text-4xl font-black text-gray-900">{stats.totalServed}</p>
					</div>
					<div class="card">
						<p class="text-gray-600 mb-2">Avg Wait Time</p>
						<p class="text-4xl font-black text-gray-900">
							{stats.avgWaitTime.toFixed(1)} min
						</p>
					</div>
					<div class="card">
						<p class="text-gray-600 mb-2">Active Counters</p>
						<p class="text-4xl font-black text-gray-900">{stats.activeCounters}</p>
					</div>
					<div class="card">
						<p class="text-gray-600 mb-2">Busiest Hour</p>
						<p class="text-4xl font-black text-gray-900">{stats.busiestHour}</p>
					</div>
				</div>

				<!-- Per-Counter Metrics -->
				<div class="card mb-8">
					<h2 class="text-2xl font-bold mb-6">Counter Performance</h2>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b">
									<th class="text-left py-3 px-4">Counter</th>
									<th class="text-left py-3 px-4">Tickets Served</th>
									<th class="text-left py-3 px-4">Avg Wait Time</th>
									<th class="text-left py-3 px-4">Avg Service Time</th>
									<th class="text-left py-3 px-4">Completion Rate</th>
								</tr>
							</thead>
							<tbody>
								{#each $counters as counter}
									{@const stats = counterStatsMap.get(counter.id)}
									<tr class="border-b hover:bg-gray-50">
										<td class="py-3 px-4 font-semibold">{counter.name}</td>
										<td class="py-3 px-4">{stats?.ticketsServed || 0}</td>
										<td class="py-3 px-4">{stats?.avgWaitTime?.toFixed(1) || '0.0'} min</td>
										<td class="py-3 px-4">{stats?.avgServiceTime?.toFixed(1) || '0.0'} min</td>
										<td class="py-3 px-4">{stats?.completionRate?.toFixed(1) || '0.0'}%</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Service Analytics -->
				<div class="card mb-8">
					<h2 class="text-2xl font-bold mb-6">Service Analytics</h2>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-b">
									<th class="text-left py-3 px-4">Service</th>
									<th class="text-left py-3 px-4">Total Tickets</th>
									<th class="text-left py-3 px-4">Served</th>
									<th class="text-left py-3 px-4">Avg Wait Time</th>
									<th class="text-left py-3 px-4">Avg Service Time</th>
								</tr>
							</thead>
							<tbody>
								{#each serviceStatsList as serviceStat}
									<tr class="border-b hover:bg-gray-50">
										<td class="py-3 px-4 font-semibold">{serviceStat.serviceName} ({serviceStat.serviceCode})</td>
										<td class="py-3 px-4">{serviceStat.totalTickets}</td>
										<td class="py-3 px-4">{serviceStat.servedTickets}</td>
										<td class="py-3 px-4">{serviceStat.avgWaitTime?.toFixed(1) || '0.0'} min</td>
										<td class="py-3 px-4">{serviceStat.avgServiceTime?.toFixed(1) || '0.0'} min</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<div class="card">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold">Queue Management</h2>
						<button 
							on:click={resetDailyQueue} 
							class="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={loading.reset}
						>
							{loading.reset ? 'Resetting...' : 'Reset Daily Queue'}
						</button>
					</div>
				</div>
			{/if}

			<!-- Counter Monitoring Tab -->
			{#if activeTab === 'monitoring'}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
					{#each $counters as counter}
						{@const stats = counterStatsMap.get(counter.id)}
						{@const service = $services.find((s) => s.id === counter.service_id)}
						{@const currentTicket = $tickets.find((t) => t.counter_id === counter.id && t.status === 'called')}
						<div class="card">
							<div class="flex justify-between items-start mb-4">
								<div>
									<h3 class="text-xl font-bold text-gray-900">{counter.name}</h3>
									<p class="text-sm text-gray-600">{service?.name || 'No Service'}</p>
								</div>
								<span
									class="px-2 py-1 rounded text-xs {counter.is_active
										? 'bg-green-100 text-green-800'
										: 'bg-gray-100 text-gray-800'}"
								>
									{counter.is_active ? 'Active' : 'Inactive'}
								</span>
							</div>
							<div class="space-y-3">
								<div>
									<p class="text-sm text-gray-600">Current Ticket</p>
									<p class="text-2xl font-black text-gray-900">
										{counter.current_ticket || '---'}
									</p>
								</div>
								<div class="grid grid-cols-2 gap-2 text-sm">
									<div>
										<p class="text-gray-600">Served Today</p>
										<p class="font-semibold">{stats?.ticketsServed || 0}</p>
									</div>
									<div>
										<p class="text-gray-600">Avg Wait</p>
										<p class="font-semibold">{stats?.avgWaitTime?.toFixed(1) || '0.0'}m</p>
									</div>
								</div>
								{#if counter.is_active}
									<button
										on:click={() => {
											supabase.from('counters').update({ is_active: false }).eq('id', counter.id);
											fetchCounters();
										}}
										class="btn-secondary w-full text-sm"
									>
										Deactivate
									</button>
								{:else}
									<button
										on:click={() => {
											supabase.from('counters').update({ is_active: true }).eq('id', counter.id);
											fetchCounters();
										}}
										class="btn-primary w-full text-sm"
									>
										Activate
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Users Tab -->
			{#if activeTab === 'users'}
				<div class="card">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-2xl font-bold">User Management</h2>
						<button
							on:click={() => {
								editingUser = null;
								userForm = { email: '', password: '', name: '', role: 'counter_staff', counter_id: '', auth_user_id: '' };
								showUserModal = true;
							}}
							class="btn-primary"
						>
							Add User
						</button>
					</div>

					{#if allUsers.length === 0}
						<div class="text-center py-12 text-gray-500">
							<svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
							<p class="text-lg font-medium">No users yet</p>
							<p class="text-sm mt-2">Get started by adding your first user</p>
						</div>
					{:else}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead>
									<tr class="border-b">
										<th class="text-left py-3 px-4">Name</th>
										<th class="text-left py-3 px-4">Email</th>
										<th class="text-left py-3 px-4">Role</th>
										<th class="text-left py-3 px-4">Counter</th>
										<th class="text-left py-3 px-4">Actions</th>
									</tr>
								</thead>
								<tbody>
									{#each allUsers as user}
										{@const counter = $counters.find((c) => c.id === user.counter_id)}
										<tr class="border-b hover:bg-gray-50">
											<td class="py-3 px-4 font-semibold">{user.name || '-'}</td>
											<td class="py-3 px-4">{user.email}</td>
											<td class="py-3 px-4">
												<span
													class="px-2 py-1 rounded text-sm {user.role === 'admin'
														? 'bg-purple-100 text-purple-800'
														: user.role === 'counter_staff'
															? 'bg-blue-100 text-blue-800'
															: 'bg-gray-100 text-gray-800'}"
												>
													{user.role}
												</span>
											</td>
											<td class="py-3 px-4">{counter?.name || '-'}</td>
											<td class="py-3 px-4">
												<button
													on:click={() => editUser(user)}
													class="text-forest-green hover:underline mr-4 disabled:opacity-50"
													disabled={loading.delete}
												>
													Edit
												</button>
												{#if user.id !== $userProfile?.id}
													<button
														on:click={() => deleteUser(user.id)}
														class="text-red-600 hover:underline disabled:opacity-50"
														disabled={loading.delete}
													>
														Delete
													</button>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			{/if}
			<!-- Settings Tab -->
			{#if activeTab === 'settings'}
				<div class="card">
					<h2 class="text-2xl font-bold mb-6">Display Settings</h2>
					
					<div class="mb-8">
						<h3 class="text-lg font-semibold mb-4">Current Display Video</h3>
						<p class="text-gray-600 mb-4">This video is currently playing on the public display screen.</p>
						
						{#if currentVideoUrl}
							<div class="mb-6">
								<div class="aspect-w-16 aspect-h-9 bg-black rounded-lg overflow-hidden max-w-xl shadow-lg border-2 border-forest-green">
									<video src={currentVideoUrl} controls class="w-full h-full object-contain"></video>
								</div>
								<p class="text-xs text-gray-500 mt-2 break-all">{currentVideoUrl}</p>
							</div>
						{:else}
							<div class="bg-gray-100 p-8 rounded-lg text-center mb-6 max-w-xl">
								<p class="text-gray-500">No video selected</p>
							</div>
						{/if}

						<div class="border-t pt-8 mt-8">
							<h3 class="text-lg font-semibold mb-4">Video Library</h3>
							<p class="text-gray-600 mb-6">Upload new videos or select an existing one to play.</p>

							<!-- Upload Section -->
							<div class="bg-gray-50 p-6 rounded-xl mb-8 border border-gray-200">
								<label for="video-upload" class="block text-sm font-bold text-gray-900 mb-2">
									Upload New Video
								</label>
								<div class="flex gap-4 items-start">
									<input
										id="video-upload"
										type="file"
										accept="video/*"
										class="block w-full text-sm text-gray-500
											file:mr-4 file:py-2 file:px-4
											file:rounded-full file:border-0
											file:text-sm file:font-semibold
											file:bg-forest-green file:text-white
											hover:file:bg-forest-green-600
											cursor-pointer"
										on:change={handleFileSelect}
									/>
									<button
										on:click={handleVideoUpload}
										disabled={!videoFile || isUploading}
										class="btn-primary whitespace-nowrap disabled:opacity-50"
									>
										{isUploading ? 'Uploading...' : 'Upload & Add to Library'}
									</button>
								</div>
								<p class="text-xs text-gray-500 mt-2">
									Supported formats: MP4, WebM.
								</p>
							</div>

							<!-- Video List -->
							<div class="space-y-4">
								<h4 class="font-medium text-gray-900">Available Videos ({videoList.length})</h4>
								
								{#if videoList.length === 0}
									<p class="text-gray-500 italic">No videos in library</p>
								{:else}
									<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{#each videoList as video}
											<div class="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group">
												<div class="aspect-w-16 aspect-h-9 bg-gray-100 rounded mb-3 overflow-hidden">
													<video 
														src={video.publicUrl} 
														class="w-full h-full object-cover"
														preload="metadata"
														controls
													></video>
												</div>
												<div class="flex justify-between items-start mb-2">
													<div class="w-full">
														<p class="font-semibold text-gray-800 truncate" title={video.name}>{video.name}</p>
														<p class="text-xs text-gray-500">
															{(video.metadata?.size / 1024 / 1024).toFixed(2)} MB • {new Date(video.created_at).toLocaleDateString()}
														</p>
													</div>
												</div>
												
												<div class="flex gap-2 mt-4">
													<button
														on:click={() => selectVideo(video.name)}
														disabled={loadingVideo}
														class="flex-1 btn-primary text-xs py-2 disabled:opacity-50"
													>
														Set as Display
													</button>
													<button
														on:click={() => deleteVideo(video.name)}
														disabled={loadingVideo}
														class="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-xs font-medium border border-transparent hover:border-red-100 transition-colors"
													>
														Delete
													</button>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
{/if}

<!-- Service Modal -->
{#if showServiceModal}
	<div 
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		on:click|self={closeServiceModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="service-modal-title"
	>
		<div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 id="service-modal-title" class="text-2xl font-bold mb-6">
				{editingService ? 'Edit Service' : 'Add Service'}
			</h3>
			<div class="space-y-4">
				<div>
					<label for="service_code" class="block text-sm font-medium mb-2">
						Code <span class="text-red-500">*</span>
					</label>
					<input
						id="service_code"
						type="text"
						bind:value={serviceForm.code}
						class="input-field {formErrors.service.code ? 'border-red-500' : ''}"
						placeholder="S1"
						maxlength="10"
						disabled={loading.service}
					/>
					{#if formErrors.service.code}
						<p class="text-red-500 text-xs mt-1">{formErrors.service.code}</p>
					{/if}
				</div>
				<div>
					<label for="service_name" class="block text-sm font-medium mb-2">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						id="service_name"
						type="text"
						bind:value={serviceForm.name}
						class="input-field {formErrors.service.name ? 'border-red-500' : ''}"
						placeholder="Service Name"
						disabled={loading.service}
					/>
					{#if formErrors.service.name}
						<p class="text-red-500 text-xs mt-1">{formErrors.service.name}</p>
					{/if}
				</div>
				<div>
					<label for="service_description" class="block text-sm font-medium mb-2">Description</label>
					<textarea
						id="service_description"
						bind:value={serviceForm.description}
						class="input-field"
						rows="3"
						placeholder="Optional description"
						disabled={loading.service}
					></textarea>
				</div>
				<div>
					<label class="flex items-center space-x-2 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={serviceForm.is_active}
							disabled={loading.service}
						/>
						<span>Active</span>
					</label>
				</div>
			</div>
			<div class="flex space-x-4 mt-6">
				<button 
					on:click={saveService} 
					class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading.service}
				>
					{loading.service ? 'Saving...' : 'Save'}
				</button>
				<button
					on:click={closeServiceModal}
					class="btn-secondary flex-1"
					disabled={loading.service}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Counter Modal -->
{#if showCounterModal}
	<div 
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		on:click|self={closeCounterModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="counter-modal-title"
	>
		<div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 id="counter-modal-title" class="text-2xl font-bold mb-6">
				{editingCounter ? 'Edit Counter' : 'Add Counter'}
			</h3>
			<div class="space-y-4">
				<div>
					<label for="counter_name" class="block text-sm font-medium mb-2">
						Name <span class="text-red-500">*</span>
					</label>
					<input
						id="counter_name"
						type="text"
						bind:value={counterForm.name}
						class="input-field {formErrors.counter.name ? 'border-red-500' : ''}"
						placeholder="Counter 1"
						disabled={loading.counter}
					/>
					{#if formErrors.counter.name}
						<p class="text-red-500 text-xs mt-1">{formErrors.counter.name}</p>
					{/if}
				</div>
				<div>
					<label for="counter_service" class="block text-sm font-medium mb-2">
						Service <span class="text-red-500">*</span>
					</label>
					<select 
						id="counter_service"
						bind:value={counterForm.service_id} 
						class="input-field {formErrors.counter.service_id ? 'border-red-500' : ''}"
						disabled={loading.counter}
					>
						<option value="">Select a service</option>
						{#each $services.filter(s => s.is_active) as service}
							<option value={service.id}>{service.name} ({service.code})</option>
						{/each}
					</select>
					{#if formErrors.counter.service_id}
						<p class="text-red-500 text-xs mt-1">{formErrors.counter.service_id}</p>
					{/if}
					{#if $services.filter(s => s.is_active).length === 0}
						<p class="text-yellow-600 text-xs mt-1">No active services available. Please create a service first.</p>
					{/if}
				</div>
				<div>
					<label class="flex items-center space-x-2 cursor-pointer">
						<input 
							type="checkbox" 
							bind:checked={counterForm.is_active}
							disabled={loading.counter}
						/>
						<span>Active</span>
					</label>
				</div>
			</div>
			<div class="flex space-x-4 mt-6">
				<button 
					on:click={saveCounter} 
					class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading.counter}
				>
					{loading.counter ? 'Saving...' : 'Save'}
				</button>
				<button
					on:click={closeCounterModal}
					class="btn-secondary flex-1"
					disabled={loading.counter}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- User Modal -->
{#if showUserModal}
	<div 
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		on:click|self={closeUserModal}
		role="dialog"
		aria-modal="true"
		aria-labelledby="user-modal-title"
	>
		<div class="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
			<h3 id="user-modal-title" class="text-2xl font-bold mb-6">
				{editingUser ? 'Edit User Profile' : 'Add User Profile'}
			</h3>
			{#if !editingUser}
				<div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
					<strong>✅ Create User:</strong> Fill in the form below to create a new user account. The system will automatically create both the authentication account and user profile.
				</div>
			{/if}
			<div class="space-y-4">
				<div>
					<label for="user_email" class="block text-sm font-medium mb-2">
						Email <span class="text-red-500">*</span>
					</label>
					<input
						id="user_email"
						type="email"
						bind:value={userForm.email}
						class="input-field {formErrors.user.email ? 'border-red-500' : ''}"
						placeholder="user@example.com"
						disabled={!!editingUser || loading.user}
						required
					/>
					{#if formErrors.user.email}
						<p class="text-red-500 text-xs mt-1">{formErrors.user.email}</p>
					{/if}
				</div>
				{#if !editingUser}
					<div>
						<label for="user_password" class="block text-sm font-medium mb-2">
							Password <span class="text-red-500">*</span>
						</label>
						<input
							id="user_password"
							type="password"
							bind:value={userForm.password}
							class="input-field {formErrors.user.password ? 'border-red-500' : ''}"
							placeholder="Minimum 6 characters"
							required
							minlength="6"
							disabled={loading.user}
						/>
						{#if formErrors.user.password}
							<p class="text-red-500 text-xs mt-1">{formErrors.user.password}</p>
						{:else}
							<p class="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
						{/if}
					</div>
				{/if}
				<div>
					<label for="user_name" class="block text-sm font-medium mb-2">Name</label>
					<input
						id="user_name"
						type="text"
						bind:value={userForm.name}
						class="input-field"
						placeholder="Full Name"
						disabled={loading.user}
					/>
				</div>
				<div>
					<label for="user_role" class="block text-sm font-medium mb-2">Role</label>
					<select 
						id="user_role" 
						bind:value={userForm.role} 
						class="input-field" 
						disabled={editingUser?.role === 'admin' || loading.user}
					>
						<option value="admin">Admin</option>
						<option value="counter_staff">Counter Staff</option>
					</select>
				</div>
				{#if userForm.role === 'counter_staff'}
					<div>
						<label for="user_counter" class="block text-sm font-medium mb-2">
							Assign Counter <span class="text-red-500">*</span>
						</label>
						<select 
							id="user_counter" 
							bind:value={userForm.counter_id} 
							class="input-field {formErrors.user.counter_id ? 'border-red-500' : ''}"
							disabled={loading.user}
						>
							<option value="">No Counter</option>
							{#each $counters.filter(c => c.is_active) as counter}
								<option value={counter.id}>{counter.name}</option>
							{/each}
						</select>
						{#if formErrors.user.counter_id}
							<p class="text-red-500 text-xs mt-1">{formErrors.user.counter_id}</p>
						{/if}
						{#if $counters.filter(c => c.is_active).length === 0}
							<p class="text-yellow-600 text-xs mt-1">No active counters available. Please create a counter first.</p>
						{/if}
					</div>
				{/if}
			</div>
			<div class="flex space-x-4 mt-6">
				<button 
					on:click={saveUser} 
					class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading.user}
				>
					{loading.user ? (editingUser ? 'Saving...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create User')}
				</button>
				<button
					on:click={closeUserModal}
					class="btn-secondary flex-1"
					disabled={loading.user}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Confirmation Dialog -->
{#if showConfirmDialog}
	<div 
		class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
		on:click|self={() => { showConfirmDialog = false; confirmAction = null; }}
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-white rounded-xl p-8 max-w-md w-full mx-4">
			<h3 class="text-xl font-bold mb-4">Confirm Action</h3>
			<p class="text-gray-700 mb-6">{confirmMessage}</p>
			<div class="flex space-x-4">
				<button
					on:click={executeConfirm}
					class="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={loading.delete || loading.reset}
				>
					{loading.delete || loading.reset ? 'Processing...' : 'Confirm'}
				</button>
				<button
					on:click={() => { showConfirmDialog = false; confirmAction = null; }}
					class="btn-secondary flex-1"
					disabled={loading.delete || loading.reset}
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}

