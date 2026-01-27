import { writable, get } from 'svelte/store';

export const soundEnabled = writable(true);
export const soundVolume = writable(1.0);

let audioContext: AudioContext | null = null;

function getAudioContext() {
	if (typeof window === 'undefined') return null;
	if (!audioContext) {
		audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
	}
	if (audioContext.state === 'suspended') {
		audioContext.resume();
	}
	return audioContext;
}

export async function initAudio() {
	if (typeof window === 'undefined') return;
	const ctx = getAudioContext();
	if (ctx && ctx.state === 'suspended') {
		await ctx.resume();
	}
}

export function playTicketSound() {
	if (typeof window === 'undefined') return;
	
	const enabled = get(soundEnabled);
	if (!enabled) return;

	const volume = get(soundVolume);
	
	try {
		const ctx = getAudioContext();
		if (!ctx) return;

		const oscillator = ctx.createOscillator();
		const gainNode = ctx.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(ctx.destination);

		oscillator.frequency.value = 800;
		oscillator.type = 'sine';

		gainNode.gain.setValueAtTime(0, ctx.currentTime);
		gainNode.gain.linearRampToValueAtTime(volume * 0.8, ctx.currentTime + 0.01);
		gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

		oscillator.start(ctx.currentTime);
		oscillator.stop(ctx.currentTime + 0.3);

		setTimeout(() => {
			const oscillator2 = ctx.createOscillator();
			const gainNode2 = ctx.createGain();

			oscillator2.connect(gainNode2);
			gainNode2.connect(ctx.destination);

			oscillator2.frequency.value = 1000;
			oscillator2.type = 'sine';

			gainNode2.gain.setValueAtTime(0, ctx.currentTime);
			gainNode2.gain.linearRampToValueAtTime(volume * 0.8, ctx.currentTime + 0.01);
			gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

			oscillator2.start(ctx.currentTime);
			oscillator2.stop(ctx.currentTime + 0.2);
		}, 150);
	} catch (error) {
		console.error('Error playing sound:', error);
	}
}

