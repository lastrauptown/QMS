<script lang="ts">
	import { toasts, removeToast } from '$lib/stores/toast';
</script>

<div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
	{#each $toasts as toast (toast.id)}
		<div
			class="p-4 rounded-lg shadow-lg flex items-start space-x-3 animate-slide-in
				{toast.type === 'success'
					? 'bg-green-50 border border-green-200 text-green-800'
					: toast.type === 'error'
						? 'bg-red-50 border border-red-200 text-red-800'
						: toast.type === 'warning'
							? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
							: 'bg-blue-50 border border-blue-200 text-blue-800'}"
			role="alert"
		>
			<div class="flex-1">
				<p class="font-medium">{toast.message}</p>
			</div>
			<button
				on:click={() => removeToast(toast.id)}
				class="text-gray-400 hover:text-gray-600"
				aria-label="Close"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
</style>

