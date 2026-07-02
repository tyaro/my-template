/**
 * Auth stub for M0.
 *
 * Replaced in M2 by the AuthProvider abstraction (spec §3.3): the layout
 * guard will call `AuthProvider.check()` and the login page will call
 * `AuthProvider.login()`.
 */

const AUTH_KEY = 'banto.auth.stub';

export function isAuthenticated(): boolean {
	if (typeof sessionStorage === 'undefined') return false;
	return sessionStorage.getItem(AUTH_KEY) === '1';
}

export function loginStub(): void {
	sessionStorage.setItem(AUTH_KEY, '1');
}

export function logoutStub(): void {
	sessionStorage.removeItem(AUTH_KEY);
}
