/**
 * Phase 0 / §7.1 axe-core accessibility scan (visual-refresh-plan.md §7.1,
 * visual-refresh-design.md §12.2). Same `visual` project (vite preview,
 * browser demo mode) and theme-priming helpers as visual.spec.ts, but
 * asserting on `axe-core` violations instead of pixels.
 *
 * Scope: dashboard / items / settings / login, each scanned once per the
 * diagonal matrix (light/standard, dark/glass) - contrast is theme-
 * dependent, so both ends of the matrix must be checked; wcag2a/wcag2aa
 * violations that are NOT contrast (roles, labels, ...) are theme-
 * independent but cheap enough to just re-check anyway rather than special
 * -case them.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { DIAGONAL_MATRIX, comboLabel, primeTheme, primeThemeAndAuth } from './theme';

interface ScannedPage {
	name: string;
	path: string;
	heading: string;
	/** Protected (app) route vs. the public login screen. */
	authed: boolean;
}

const PAGES: ScannedPage[] = [
	{ name: 'dashboard', path: '/dashboard', heading: 'ダッシュボード', authed: true },
	{ name: 'items', path: '/items', heading: '商品', authed: true },
	{ name: 'settings', path: '/settings', heading: '設定', authed: true },
	{ name: 'login', path: '/login', heading: 'Banto', authed: false }
];

/** Readable failure message: rule id + impact + affected node selectors, so a CI failure is actionable without opening the HTML report. */
function formatViolations(violations: import('axe-core').Result[]): string {
	return violations
		.map((v) => {
			const nodes = v.nodes.map((n) => `    - ${n.target.join(' ')}`).join('\n');
			return `[${v.impact ?? 'n/a'}] ${v.id}: ${v.help}\n${nodes}`;
		})
		.join('\n\n');
}

/**
 * Violations that live inside a `packages/*` component, not admin-template
 * itself - this unit (Phase 0, visual-refresh-plan.md §6 unit 0) only
 * touches `e2e/` + `sampleData.ts`, so a package-side fix (even a
 * single-line CSS color change) is out of scope here and left for the unit
 * that already owns that package's styling (grid-svelte -> unit 4,
 * dock-svelte -> unit 3). Excluded node-by-node (never a blanket rule
 * disable) so every OTHER violation on the same page still fails the scan.
 * Listed in full in the implementation report; each entry must be re-
 * checked (and ideally removed) once its owning unit lands.
 */
const PACKAGE_OWNED_EXCLUSIONS: Record<string, { selectors: string[]; reason: string }> = {
	dashboard: {
		selectors: ['.dock-wrapper [role="button"].titlebar', '.dock-wrapper .body'],
		// `packages/dock-svelte/src/DockedTree.svelte`: a docked pane's
		// titlebar is `role="button"` (drag-to-reorder) wrapping a real
		// focusable pop-out/close <button> (axe `nested-interactive`), and its
		// scrollable body has no `tabindex` (axe `scrollable-region-focusable`).
		// `.dock-wrapper` is admin-template's own wrapper around <DockHost>
		// (routes/(app)/dashboard/+page.svelte), so this only ever matches the
		// dashboard's docked panes, never grid/form/other controls.
		reason:
			'dock-svelte docked-pane titlebar/body structure (nested-interactive, scrollable-region-focusable)'
	},
	items: {
		selectors: ['a.cell-link'],
		// `packages/grid-svelte/src/BantoGrid.svelte`'s href-cell link uses
		// plain `--banto-primary` text, which falls short of 4.5:1 on the dark
		// theme's cell background (same class of issue as the app-side fixes
		// in Sidebar.svelte/dashboard/+page.svelte/settings/+page.svelte, just
		// not fixable without editing the package).
		reason: 'grid-svelte href-cell link color-contrast (dark theme)'
	}
};

async function gotoScanned(page: Page, target: ScannedPage): Promise<void> {
	await page.goto(target.path);
	await expect(page.getByRole('heading', { name: target.heading })).toBeVisible();
	// Chart-heavy pages (dashboard) render async off the seeded dataset -
	// same rationale as visual.spec.ts: wait for a concrete element, not a
	// network signal.
	if (target.name === 'dashboard') {
		await expect(page.locator('svg').first()).toBeVisible();
	}
}

for (const combo of DIAGONAL_MATRIX) {
	test.describe(`a11y ${comboLabel(combo)}`, () => {
		for (const target of PAGES) {
			test(`${target.name} has no wcag2a/wcag2aa violations`, async ({ page }) => {
				if (target.authed) {
					await primeThemeAndAuth(page, combo);
				} else {
					await primeTheme(page, combo);
				}
				await gotoScanned(page, target);

				let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
				for (const selector of PACKAGE_OWNED_EXCLUSIONS[target.name]?.selectors ?? []) {
					builder = builder.exclude(selector);
				}
				const results = await builder.analyze();

				expect(results.violations, formatViolations(results.violations)).toEqual([]);
			});
		}
	});
}
