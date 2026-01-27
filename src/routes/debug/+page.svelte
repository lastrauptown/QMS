<script lang="ts">
	import { onMount } from 'svelte';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import { supabase } from '$lib/supabase';

	let connectionStatus = 'Checking...';
	let envStatus = {
		url: PUBLIC_SUPABASE_URL || 'MISSING',
		key: PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING'
	};

	onMount(async () => {
		try {
			const { data, error } = await supabase.from('services').select('count').limit(1);
			if (error) {
				connectionStatus = `Error: ${error.message}`;
			} else {
				connectionStatus = 'Connected successfully!';
			}
		} catch (e: any) {
			connectionStatus = `Exception: ${e.message}`;
		}
	});
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="max-w-2xl mx-auto">
		<h1 class="text-3xl font-bold mb-6">Debug Information</h1>
		
		<div class="card mb-4">
			<h2 class="text-xl font-semibold mb-4">Environment Variables</h2>
			<div class="space-y-2">
				<div>
					<strong>PUBLIC_SUPABASE_URL:</strong>
					<span class="ml-2 {envStatus.url === 'MISSING' ? 'text-red-600' : 'text-green-600'}">
						{envStatus.url}
					</span>
				</div>
				<div>
					<strong>PUBLIC_SUPABASE_ANON_KEY:</strong>
					<span class="ml-2 {envStatus.key === 'MISSING' ? 'text-red-600' : 'text-green-600'}">
						{envStatus.key}
					</span>
				</div>
			</div>
		</div>

		<div class="card mb-4">
			<h2 class="text-xl font-semibold mb-4">Database Connection</h2>
			<p class="text-lg">{connectionStatus}</p>
		</div>

		<div class="card">
			<h2 class="text-xl font-semibold mb-4">Quick Links</h2>
			<div class="space-y-2">
				<a href="/login" class="block text-forest-green hover:underline">Login Page</a>
				<a href="/display" class="block text-forest-green hover:underline">Public Display</a>
				<a href="/ticket" class="block text-forest-green hover:underline">Create Ticket</a>
			</div>
		</div>
	</div>
</div>

