import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info' | 'warning';
	duration?: number;
}

export const toasts = writable<Toast[]>([]);

export function showToast(message: string, type: Toast['type'] = 'info', duration = 3000) {
	const id = Math.random().toString(36).substring(7);
	const toast: Toast = { id, message, type, duration };
	
	toasts.update((list) => [...list, toast]);
	
	if (duration > 0) {
		setTimeout(() => {
			removeToast(id);
		}, duration);
	}
	
	return id;
}

export function removeToast(id: string) {
	toasts.update((list) => list.filter((t) => t.id !== id));
}

export function showSuccess(message: string) {
	return showToast(message, 'success');
}

export function showError(message: string) {
	return showToast(message, 'error', 5000);
}

export function showInfo(message: string) {
	return showToast(message, 'info');
}

export function showWarning(message: string) {
	return showToast(message, 'warning');
}

