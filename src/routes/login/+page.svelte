<script lang="ts">
	import { signIn } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { userProfile } from '$lib/stores/auth';

	let email = '';
	let password = '';
	let showPassword = false;
	let error = '';
	let loading = false;

	$: if ($userProfile) {
		if ($userProfile.role === 'admin') {
			goto('/admin');
		} else if ($userProfile.role === 'counter_staff') {
			goto('/counter');
		}
	}

	async function handleLogin() {
		error = '';
		loading = true;

		try {
			await signIn(email, password);
			
			// Wait a bit for userProfile to be set
			await new Promise(resolve => setTimeout(resolve, 100));
			
			if ($userProfile) {
				if ($userProfile.role === 'admin') {
					goto('/admin');
				} else if ($userProfile.role === 'counter_staff') {
					goto('/counter');
				} else {
					// Invalid role - should not happen with new schema
					error = 'Invalid user role. Please contact administrator.';
					console.error('User has invalid role:', $userProfile.role);
				}
			} else {
				// Auth succeeded but profile not found
				error = 'User profile not found. Please contact administrator to create your profile.';
				console.error('Login succeeded but userProfile is null');
			}
		} catch (e: any) {
			console.error('Login error:', e);
			error = e.message || e.error?.message || 'Login failed. Please check your credentials.';
			
			// More specific error messages
			if (e.message?.includes('Invalid login credentials')) {
				error = 'Invalid email or password. Please try again.';
			} else if (e.message?.includes('User profile not found')) {
				error = 'Your account exists but profile is missing. Please contact administrator.';
			} else if (e.message?.includes('Email not confirmed')) {
				error = 'Please confirm your email address first.';
			}
		} finally {
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
	<main class="flex-grow flex items-center justify-center px-4">
		<div class="max-w-md w-full">
			<div class="text-center mb-8">
				<img
					src="/logo-sanpedro.png"
					alt="City of San Pedro, Laguna, Philippines"
					class="mx-auto mb-4 h-24 w-24 object-contain"
				/>
				<h2 class="text-3xl font-bold text-gray-900 mb-2">Queue Management System</h2>
				<p class="text-gray-600">City of San Pedro, Laguna</p>
				<p class="text-sm text-gray-500 mt-2">Sign in to your account</p>
			</div>

			<div class="card">
				{#if error}
					<div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
						{error}
					</div>
				{/if}

				<form on:submit|preventDefault={handleLogin} class="space-y-6">
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
							Email Address
						</label>
						<input
							id="email"
							type="email"
							bind:value={email}
							required
							class="input-field"
							placeholder="you@example.com"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
							Password
						</label>
						<div class="relative">
							{#if showPassword}
								<input
									id="password"
									type="text"
									bind:value={password}
									required
									class="input-field pr-10"
									placeholder="••••••••"
								/>
							{:else}
								<input
									id="password"
									type="password"
									bind:value={password}
									required
									class="input-field pr-10"
									placeholder="••••••••"
								/>
							{/if}
							<button
								type="button"
								class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
								on:click={() => showPassword = !showPassword}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
									</svg>
								{:else}
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
										<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
								{/if}
							</button>
						</div>
					</div>

					<button
						type="submit"
						disabled={loading}
						class="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>

				<div class="mt-6 text-center">
					<a href="/display" class="text-forest-green hover:underline">View Public Display</a>
				</div>
			</div>
		</div>
	</main>

	<footer class="bg-gray-800 text-white py-4">
		<div class="container mx-auto px-4 text-center text-sm opacity-60">
			<p class="text-xs">Developed by Mark Joshua Punzalan OJT</p>
		</div>
	</footer>
</div>

