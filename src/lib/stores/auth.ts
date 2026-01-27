import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface UserProfile {
	id: string;
	email: string;
	role: 'admin' | 'counter_staff';
	counter_id?: string | null;
	name?: string;
}

export const user = writable<User | null>(null);
export const userProfile = writable<UserProfile | null>(null);

export async function signIn(email: string, password: string) {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) throw error;

	if (data.user) {
		user.set(data.user);
		await fetchUserProfile(data.user.id);
	}

	return data;
}

export async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
	user.set(null);
	userProfile.set(null);
}

export async function fetchUserProfile(userId: string) {
	try {
		const { data, error } = await supabase
			.from('user_profiles')
			.select('*')
			.eq('id', userId)
			.single();

		if (error) {
			console.error('User profile not found:', error.message);
			console.error('Error details:', error);
			// If profile doesn't exist, create a default one
			if (error.code === 'PGRST116') {
				console.warn('Profile not found, user may need to be added to user_profiles table');
				throw new Error('User profile not found. Please contact administrator to create your profile.');
			}
			throw error;
		}
		
		if (!data) {
			throw new Error('User profile data is empty');
		}
		
		userProfile.set(data);
		return data;
	} catch (error: any) {
		console.error('Error fetching user profile:', error);
		userProfile.set(null);
		throw error;
	}
}

export async function checkAuth() {
	try {
		const { data: { session }, error } = await supabase.auth.getSession();
		if (error) {
			console.warn('Auth session error:', error.message);
			return null;
		}
		if (session?.user) {
			user.set(session.user);
			await fetchUserProfile(session.user.id);
		}
		return session;
	} catch (error) {
		console.error('Error checking auth:', error);
		return null;
	}
}

