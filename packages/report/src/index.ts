/**
 * Public entry point for @banto/report (docs/report-plan.md, M19 unit A).
 * Headless template parser/binder/renderer only - `ReportView.svelte`,
 * print CSS and the items demo page are unit B (not built here).
 */
export { renderReport, type RenderOptions, type RenderResult } from './core/index';
