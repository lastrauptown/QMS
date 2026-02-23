import { writable } from 'svelte/store';

export interface UserProfile {
	id: string;
	email: string;
	role: 'admin' | 'counter_staff';
	counter_id?: string | null;
	name?: string;
}

export const user = writable<any | null>(null);
export const userProfile = writable<UserProfile | null>(null);

export async function signIn(email: string, password: string) {
	try {
		const response = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Login failed');
		}

		if (data.user) {
			user.set(data.user);
			await fetchUserProfile(data.user.id);
		if (typeof window !== 'undefined' && data.session?.access_token) {
			localStorage.setItem('access_token', data.session.access_token);
		}
		}

		return data;
	} catch (error) {
		console.error('Sign in error:', error);
		throw error;
	}
}

export async function signOut() {
	user.set(null);
	userProfile.set(null);
	if (typeof window !== 'undefined') {
		localStorage.removeItem('user');
		localStorage.removeItem('userProfile');
		localStorage.removeItem('access_token');
		localStorage.removeItem('activeCounterId');
	}
}

export async function fetchUserProfile(userId: string) {
	try {
		const response = await fetch(`/api/auth/profile?id=${userId}`);
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Failed to fetch profile');
		}

		userProfile.set(data);
	if (typeof window !== 'undefined') {
		localStorage.setItem('userProfile', JSON.stringify(data));
	}
		return data;
	} catch (error) {
		console.error('Error fetching user profile:', error);
		userProfile.set(null);
		throw error;
	}
}

export async function checkAuth() {
	// For this simplified version without persistent sessions/cookies in browser for now,
	// we rely on the state. If you reload, you might lose auth.
	// To persist, we'd need to store the token in localStorage and validate it.
	
	// Check localStorage for a simplified persistence
	try {
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			const userData = JSON.parse(storedUser);
			user.set(userData);
			const storedProfile = localStorage.getItem('userProfile');
			if (storedProfile) {
				try {
					const profileData = JSON.parse(storedProfile);
					if (profileData?.id === userData.id) {
						userProfile.set(profileData);
						return { user: userData };
					}
				} catch {}
			}
			await fetchUserProfile(userData.id);
			return { user: userData };
		}
		
		// Fallback: if user is missing but we still have a profile, reconstruct the user
		const storedProfile = localStorage.getItem('userProfile');
		if (storedProfile) {
			try {
				const profileData = JSON.parse(storedProfile);
				if (profileData && profileData.id && profileData.email && profileData.role) {
					const reconstructedUser = {
						id: profileData.id,
						email: profileData.email,
						role: profileData.role
					};
					user.set(reconstructedUser);
					userProfile.set(profileData);
					// Persist reconstructed user to avoid repeated fallback
					localStorage.setItem('user', JSON.stringify(reconstructedUser));
					return { user: reconstructedUser };
				}
			} catch (e) {
				console.warn('Failed to parse stored userProfile for auth fallback:', e);
			}
		}
	} catch (e) {
		console.error('checkAuth error:', e);
	}
	return null;
}

// Subscribe to user changes to update localStorage
user.subscribe(value => {
	if (typeof window !== 'undefined') {
		if (value) {
			localStorage.setItem('user', JSON.stringify(value));
		} else {
			localStorage.removeItem('user');
		}
	}
});
