/**
 * Monthly report template — TypeBox schema + render dispatcher.
 *
 * Renderers (PDF, PPTX, XLSX) are implemented in sibling packages and will
 * be wired in once the renderer tasks are merged. Until then, render() stubs
 * each format so the registry and tool layer can be built and tested independently.
 */

import { type Static, Type } from "@sinclair/typebox"
import { Value } from "@sinclair/typebox/value"
import type { MonthlyReportData, RenderOpts, ReportTemplate } from "./types.js"

// ---------------------------------------------------------------------------
// TypeBox schema
// ---------------------------------------------------------------------------

const SessionMetricRowSchema = Type.Object({
	sessionId: Type.String(),
	messageCount: Type.Number({ minimum: 0 }),
	toolCallCount: Type.Number({ minimum: 0 }),
	durationSeconds: Type.Number({ minimum: 0 }),
})

/** TypeBox schema for {@link MonthlyReportData}. */
export const MonthlyReportDataSchema = Type.Object({
	period: Type.String({ minLength: 1 }),
	totalSessions: Type.Number({ minimum: 0 }),
	totalMessages: Type.Number({ minimum: 0 }),
	totalToolCalls: Type.Number({ minimum: 0 }),
	sessions: Type.Array(SessionMetricRowSchema),
})

/** Inferred static type from the TypeBox schema (matches MonthlyReportData). */
export type MonthlyReportDataSchema = Static<typeof MonthlyReportDataSchema>

// ---------------------------------------------------------------------------
// Renderer dispatcher
// ---------------------------------------------------------------------------

/**
 * Dispatch render to the appropriate format renderer.
 * Renderer implementations are injected at runtime once the renderer packages
 * are available; until then, each branch throws a "not yet implemented" error.
 */
const renderMonthlyReport = async (_data: MonthlyReportData, opts: RenderOpts): Promise<string> => {
	switch (opts.format) {
		case "pdf":
			// TODO: import and call PDF renderer once packages/skills/reports/src/renderers/pdf.tsx is merged
			throw new Error("PDF renderer not yet wired — pending renderer task merge")
		case "pptx":
			// TODO: import and call PPTX renderer once packages/skills/reports/src/renderers/pptx.ts is merged
			throw new Error("PPTX renderer not yet wired — pending renderer task merge")
		case "xlsx":
			// TODO: import and call XLSX renderer once packages/skills/reports/src/renderers/xlsx.ts is merged
			throw new Error("XLSX renderer not yet wired — pending renderer task merge")
		default: {
			// Exhaustiveness check
			const _exhaustive: never = opts.format
			throw new Error(`Unsupported format: ${String(_exhaustive)}`)
		}
	}
}

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

/**
 * Monthly report template.
 * Validates input via TypeBox and dispatches rendering to format-specific renderers.
 */
export const MonthlyReportTemplate: ReportTemplate<MonthlyReportData> = {
	name: "monthly-report",
	title: "Monthly Activity Report",
	formats: ["pdf", "pptx", "xlsx"],

	parse: (raw: unknown): MonthlyReportData => {
		if (!Value.Check(MonthlyReportDataSchema, raw)) {
			const errors = [...Value.Errors(MonthlyReportDataSchema, raw)]
			const summary = errors.map((e) => `${e.path}: ${e.message}`).join("; ")
			throw new Error(`Invalid MonthlyReportData: ${summary}`)
		}
		return raw as MonthlyReportData
	},

	render: renderMonthlyReport,
}
