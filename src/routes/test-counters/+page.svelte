<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

	let counters: any[] = [];
	let error: any = null;
	let loading = true;
	let envVars = {
		url: PUBLIC_SUPABASE_URL,
		key: PUBLIC_SUPABASE_ANON_KEY ? 'Present' : 'Missing'
	};

	onMount(async () => {
		try {
			const { data, error: err } = await supabase
				.from('counters')
				.select('*');
			
			if (err) throw err;
			counters = data || [];
		} catch (e) {
			error = e;
		} finally {
			loading = false;
		}
	});
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Counters Test</h1>
	
	<div class="bg-blue-50 p-4 rounded mb-4">
		<h2 class="font-bold">Environment Variables:</h2>
		<pre>{JSON.stringify(envVars, null, 2)}</pre>
	</div>

	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<div class="bg-red-100 p-4 rounded text-red-700">
			<h2 class="font-bold">Error:</h2>
			<pre>{JSON.stringify(error, null, 2)}</pre>
		</div>
	{:else}
		<div class="bg-gray-100 p-4 rounded">
			<h2 class="font-bold mb-2">Counters ({counters.length}):</h2>
			<pre class="text-xs">{JSON.stringify(counters, null, 2)}</pre>
		</div>
	{/if}
</div>
