<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { checkAuth } from '$lib/stores/auth';
	import { isLoading } from '$lib/stores/ui';
	import ToastContainer from '$lib/components/ToastContainer.svelte';

	let loadingTimeout: any;

	onMount(async () => {
		isLoading.set(true);
		
		// Safety timeout to prevent infinite loading
		loadingTimeout = setTimeout(() => {
			isLoading.update(loading => {
				if (loading) {
					console.warn('Loading timed out - forcing completion');
					return false;
				}
				return loading;
			});
		}, 15000); // 15 seconds max load time

		try {
			await checkAuth();
		} catch (error) {
			console.error('Auth check failed:', error);
		} finally {
			isLoading.set(false);
			if (loadingTimeout) clearTimeout(loadingTimeout);
		}
	});

	onDestroy(() => {
		if (loadingTimeout) clearTimeout(loadingTimeout);
	});
</script>

{#if $isLoading}
	<div class="fixed inset-0 bg-white z-50 flex items-center justify-center flex-col gap-4 transition-opacity duration-300">
		<div class="relative">
			<div class="w-20 h-20 border-4 border-forest-green/20 border-t-forest-green rounded-full animate-spin"></div>
			<div class="absolute inset-0 flex items-center justify-center">
				<img src="/logo-sanpedro.png" alt="Logo" class="w-10 h-10 object-contain animate-pulse" />
			</div>
		</div>
		<p class="text-forest-green font-bold text-lg animate-pulse tracking-wide">Loading System...</p>
		<p class="text-gray-400 text-xs">Please wait while we connect securely</p>
	</div>
{/if}

<slot />

<ToastContainer />

