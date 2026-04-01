// Reports Skill — template-based report generation.
export type {
	MonthlyReportData,
	RenderOpts,
	ReportFormat,
	ReportTemplate,
	SessionMetricRow,
} from "./templates/types.js"
export { MonthlyReportDataSchema, MonthlyReportTemplate } from "./templates/monthly-report.js"
export { getTemplate, listTemplates, registerTemplate } from "./templates/registry.js"
