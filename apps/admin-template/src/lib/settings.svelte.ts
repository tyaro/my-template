/**
 * App settings store (Svelte 5 runes).
 *
 * Persistence is localStorage for M0. From M6 this moves behind the
 * SettingsProvider abstraction (spec §11.3, §12.1): local SQLite settings
 * DB in the webview, localStorage for remote browser clients.
 */
import { applyTheme, isThemeMode, watchSystemTheme, type ThemeMode } from '@banto/theme';

const THEME_KEY = 'banto.theme';

function loadThemeMode(): ThemeMode {
	if (typeof localStorage === 'undefined') return 'system';
	const stored = localStorage.getItem(THEME_KEY);
	return isThemeMode(stored) ? stored : 'system';
}

class Settings {
	themeMode: ThemeMode = $state(loadThemeMode());
	sidebarCollapsed = $state(false);

	#unwatchSystem: (() => void) | undefined;

	setThemeMode(mode: ThemeMode) {
		this.themeMode = mode;
		localStorage.setItem(THEME_KEY, mode);
		applyTheme(mode);

		this.#unwatchSystem?.();
		this.#unwatchSystem = undefined;
		if (mode === 'system') {
			this.#unwatchSystem = watchSystemTheme(() => applyTheme('system'));
		}
	}

	/** Call once on app mount to sync the DOM and start OS-theme watching. */
	init() {
		this.setThemeMode(this.themeMode);
	}

	toggleSidebar() {
		this.sidebarCollapsed = !this.sidebarCollapsed;
	}
}

export const settings = new Settings();
