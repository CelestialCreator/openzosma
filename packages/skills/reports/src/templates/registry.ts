/**
 * Template registry — maps template names to ReportTemplate instances.
 *
 * Built-in templates are registered on module load. Custom templates can be
 * added at runtime via {@link registerTemplate}.
 */

import { MonthlyReportTemplate } from "./monthly-report.js"
import type { ReportTemplate } from "./types.js"

// biome-ignore lint/suspicious/noExplicitAny: registry stores heterogeneous templates keyed by name
const registry = new Map<string, ReportTemplate<any>>()

/**
 * Register a template. If a template with the same name is already registered,
 * it will be overwritten.
 *
 * @param template - The template to register.
 */
export const registerTemplate = <T>(template: ReportTemplate<T>): void => {
	registry.set(template.name, template)
}

/**
 * Return the names and titles of all registered templates.
 */
export const listTemplates = (): Array<{ name: string; title: string }> =>
	[...registry.values()].map((t) => ({ name: t.name, title: t.title }))

/**
 * Look up a template by name.
 *
 * @param name - The template name.
 * @returns The template, or `undefined` if not found.
 */
// biome-ignore lint/suspicious/noExplicitAny: intentional — callers must narrow the returned template
export const getTemplate = (name: string): ReportTemplate<any> | undefined => registry.get(name)

// ---------------------------------------------------------------------------
// Built-in registrations
// ---------------------------------------------------------------------------

registerTemplate(MonthlyReportTemplate)
