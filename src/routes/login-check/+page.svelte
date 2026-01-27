<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { PUBLIC_SUPABASE_URL } from '$env/static/public';

	let checks: any[] = [];
	let email = 'admin@sanpedro.com';

	onMount(async () => {
		await runDiagnostics();
	});

	async function runDiagnostics() {
		checks = [];
		
		// Check 1: Environment variables
		checks.push({
			name: 'Environment Variables',
			status: PUBLIC_SUPABASE_URL ? 'pass' : 'fail',
			message: PUBLIC_SUPABASE_URL ? 'Supabase URL is set' : 'Supabase URL is missing'
		});

		// Check 2: Supabase connection
		try {
			const { error } = await supabase.from('services').select('count').limit(1);
			checks.push({
				name: 'Database Connection',
				status: error ? 'fail' : 'pass',
				message: error ? `Error: ${error.message}` : 'Connected successfully'
			});
		} catch (e: any) {
			checks.push({
				name: 'Database Connection',
				status: 'fail',
				message: `Exception: ${e.message}`
			});
		}

		// Check 3: Check if user exists in auth (requires manual check)
		checks.push({
			name: 'User in Authentication',
			status: 'info',
			message: 'Check Supabase Dashboard > Authentication > Users for ' + email
		});

		// Check 4: Check user_profiles table
		try {
			const { data, error } = await supabase
				.from('user_profiles')
				.select('*')
				.eq('email', email)
				.single();
			
			if (error) {
				checks.push({
					name: 'User Profile',
					status: 'fail',
					message: `Profile not found: ${error.message}. User needs to be added to user_profiles table.`
				});
			} else {
				checks.push({
					name: 'User Profile',
					status: 'pass',
					message: `Found profile with role: ${data.role}`
				});
			}
		} catch (e: any) {
			checks.push({
				name: 'User Profile',
				status: 'fail',
				message: `Error: ${e.message}`
			});
		}

		// Check 5: RLS policies
		try {
			const { error } = await supabase
				.from('user_profiles')
				.select('id')
				.limit(1);
			
			checks.push({
				name: 'RLS Policies',
				status: error?.code === '42501' ? 'fail' : 'pass',
				message: error?.code === '42501' 
					? 'RLS blocking access. Run fix-database.sql'
					: 'RLS policies working'
			});
		} catch (e: any) {
			checks.push({
				name: 'RLS Policies',
				status: 'fail',
				message: `Error: ${e.message}`
			});
		}
	}

	async function testLogin() {
		const testEmail = email;
		const testPassword = prompt('Enter password for ' + testEmail + ':');
		if (!testPassword) return;

		checks.push({
			name: 'Login Test',
			status: 'info',
			message: 'Attempting login...'
		});

		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: testEmail,
				password: testPassword
			});

			if (error) {
				checks.push({
					name: 'Login Result',
					status: 'fail',
					message: `Login failed: ${error.message}`
				});
			} else {
				checks.push({
					name: 'Login Result',
					status: 'pass',
					message: `Login successful! User ID: ${data.user?.id}`
				});

				// Try to fetch profile
				if (data.user) {
					const { data: profile, error: profileError } = await supabase
						.from('user_profiles')
						.select('*')
						.eq('id', data.user.id)
						.single();

					if (profileError) {
						checks.push({
							name: 'Profile Fetch',
							status: 'fail',
							message: `Cannot fetch profile: ${profileError.message}`
						});
					} else {
						checks.push({
							name: 'Profile Fetch',
							status: 'pass',
							message: `Profile found! Role: ${profile.role}`
						});
					}
				}
			}
		} catch (e: any) {
			checks.push({
				name: 'Login Test',
				status: 'fail',
				message: `Exception: ${e.message}`
			});
		}
	}
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="max-w-3xl mx-auto">
		<h1 class="text-3xl font-bold mb-6">Login Diagnostics</h1>

		<div class="card mb-6">
			<div class="mb-4">
				<label class="block text-sm font-medium mb-2">Test Email</label>
				<input
					type="email"
					bind:value={email}
					class="input-field"
					placeholder="admin@sanpedro.com"
				/>
			</div>
			<button on:click={runDiagnostics} class="btn-primary mr-2">Run Diagnostics</button>
			<button on:click={testLogin} class="btn-secondary">Test Login</button>
		</div>

		<div class="space-y-4">
			{#each checks as check}
				<div class="card">
					<div class="flex items-center justify-between">
						<div class="flex items-center space-x-3">
							{#if check.status === 'pass'}
								<span class="text-2xl">✅</span>
							{:else if check.status === 'fail'}
								<span class="text-2xl">❌</span>
							{:else}
								<span class="text-2xl">ℹ️</span>
							{/if}
							<div>
								<h3 class="font-semibold text-gray-900">{check.name}</h3>
								<p class="text-sm text-gray-600">{check.message}</p>
							</div>
						</div>
						<span
							class="px-3 py-1 rounded text-sm {check.status === 'pass'
								? 'bg-green-100 text-green-800'
								: check.status === 'fail'
									? 'bg-red-100 text-red-800'
									: 'bg-blue-100 text-blue-800'}"
						>
							{check.status}
						</span>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-6 card">
			<h2 class="text-xl font-semibold mb-4">Common Issues & Solutions</h2>
			<div class="space-y-3 text-sm">
				<div>
					<strong>❌ "Invalid login credentials"</strong>
					<p class="text-gray-600">User doesn't exist in Authentication or wrong password. Create user in Supabase Dashboard > Authentication > Users</p>
				</div>
				<div>
					<strong>❌ "User profile not found"</strong>
					<p class="text-gray-600">User exists in auth but not in user_profiles. Run SQL to create profile:</p>
					<code class="block bg-gray-100 p-2 rounded mt-1">
						INSERT INTO user_profiles (id, email, role) VALUES ('USER_UID', '{email}', 'admin');
					</code>
				</div>
				<div>
					<strong>❌ "RLS policy violation"</strong>
					<p class="text-gray-600">Run database/fix-database.sql in Supabase SQL Editor</p>
				</div>
			</div>
		</div>
	</div>
</div>

