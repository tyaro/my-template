import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/auth';

// Auth guard for the whole (app) group (spec §8.1).
// TODO(M2): replace the stub with AuthProvider.check().
export function load() {
	if (!isAuthenticated()) {
		redirect(307, '/login');
	}
}
