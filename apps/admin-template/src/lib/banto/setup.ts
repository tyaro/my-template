/**
 * Wires @banto/admin-core for the admin-template app (spec §3, §8): the
 * items resource + schema, an AuthProvider, and a DataProvider. Imported
 * once (side-effect) from the root layout, before any route guard runs, so
 * getDataProvider()/getAuthProvider() are ready everywhere.
 *
 * M2 Phase B (spec §10, §11.1): the environment is detected at startup via
 * `isTauri()`. Inside the Tauri webview, `createTauriDataProvider`/
 * `createTauriAuthProvider` map onto the Rust service layer (real SQLite
 * persistence, 1,000-row seed). In a plain browser (no Tauri runtime -
 * e.g. `vite dev` in a regular tab), the InMemoryDataProvider + demo
 * sessionStorage auth from M2 Phase A are used instead, so the app/tests
 * still run without a Tauri backend. The resource/schema definitions and
 * AuthProvider/DataProvider contracts stay identical either way - UI code
 * never branches on environment (spec §11.1).
 */
import { createInMemoryDataProvider, createTauriAuthProvider, createTauriDataProvider, initBanto } from '@banto/admin-core';
import type { AuthProvider, DataProvider, ResourceDefinition } from '@banto/admin-core';
import type { FormSchema } from '@banto/forms';
// Safe to import in a plain browser (no Tauri runtime): only ever *called*
// when isTauri() is true.
import { invoke } from '@tauri-apps/api/core';
import { toastStore } from '$lib/toast.svelte';
import { sampleItems } from './sampleData';

const AUTH_KEY = 'banto.auth.demo';

/** True inside the Tauri webview, false in a plain browser tab (spec §11.1). */
export function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const itemsSchema: FormSchema = {
	fields: [
		{ name: 'name', label: '商品名', type: 'text', required: true, min: 1, max: 40 },
		{ name: 'price', label: '価格', type: 'number', required: true, min: 0, max: 99999 },
		{ name: 'stock', label: '在庫', type: 'number', required: true, min: 0 },
		{ name: 'updatedAt', label: '更新日', type: 'date', readonly: true }
	]
};

const itemsResource: ResourceDefinition = {
	name: 'items',
	label: '商品',
	icon: '📦',
	schema: itemsSchema,
	capabilities: { list: true, create: true, edit: true, delete: true }
};

function isSessionAuthed(): boolean {
	return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(AUTH_KEY) === '1';
}

/**
 * Demo AuthProvider (spec §3.3): fixed admin/admin credentials backed by
 * sessionStorage. Used in plain-browser dev only; inside Tauri,
 * `createTauriAuthProvider` below calls the real `auth_*` Rust commands
 * instead (same admin/admin demo credentials, checked server-side).
 */
const demoAuthProvider: AuthProvider = {
	async login(params) {
		const { username, password } = params as { username?: string; password?: string };
		if (username === 'admin' && password === 'admin') {
			sessionStorage.setItem(AUTH_KEY, '1');
			return { success: true };
		}
		return { success: false, error: 'ユーザー名またはパスワードが違います' };
	},
	async logout() {
		sessionStorage.removeItem(AUTH_KEY);
	},
	async check() {
		return isSessionAuthed();
	},
	async getIdentity() {
		return isSessionAuthed() ? { id: 'admin', name: '管理者' } : null;
	}
};

// M2 Phase B (spec §10, §11.1): Tauri webview -> Rust+SQLite via invoke();
// plain browser -> InMemoryDataProvider + demo sessionStorage auth. Neither
// the resource/schema definitions above nor any UI code branches on this.
const dataProvider: DataProvider = isTauri()
	? createTauriDataProvider({ invoke })
	: createInMemoryDataProvider({ items: { rows: sampleItems } });

const authProvider: AuthProvider = isTauri() ? createTauriAuthProvider({ invoke }) : demoAuthProvider;

initBanto({
	dataProvider,
	authProvider,
	notifier: { notify: (kind, message) => toastStore.push(kind, message) },
	resources: [itemsResource]
});
