/**
 * Tests for the template registry.
 */

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getTemplate, listTemplates, registerTemplate } from "./registry.js"
import type { ReportTemplate } from "./types.js"

describe("template registry", () => {
	it("lists built-in monthly-report template", () => {
		const templates = listTemplates()
		const names = templates.map((t) => t.name)
		assert.ok(names.includes("monthly-report"), "monthly-report should be registered by default")
	})

	it("getTemplate returns the monthly-report template", () => {
		const tmpl = getTemplate("monthly-report")
		assert.ok(tmpl !== undefined, "monthly-report should be found")
		assert.equal(tmpl.name, "monthly-report")
		assert.equal(tmpl.title, "Monthly Activity Report")
		assert.deepEqual(tmpl.formats, ["pdf", "pptx", "xlsx"])
	})

	it("getTemplate returns undefined for unknown name", () => {
		const tmpl = getTemplate("nonexistent-report")
		assert.equal(tmpl, undefined)
	})

	it("registerTemplate adds a custom template and it appears in listTemplates", () => {
		const custom: ReportTemplate<{ x: number }> = {
			name: "custom-test",
			title: "Custom Test Report",
			formats: ["xlsx"],
			parse: (raw) => raw as { x: number },
			render: async (_data, opts) => opts.outputPath,
		}

		registerTemplate(custom)

		const found = getTemplate("custom-test")
		assert.ok(found !== undefined, "custom template should be found after registration")
		assert.equal(found.name, "custom-test")

		const names = listTemplates().map((t) => t.name)
		assert.ok(names.includes("custom-test"))
	})

	it("registerTemplate overwrites an existing template with the same name", () => {
		const v1: ReportTemplate<{ v: number }> = {
			name: "overwrite-test",
			title: "Version 1",
			formats: ["pdf"],
			parse: (raw) => raw as { v: number },
			render: async (_data, opts) => opts.outputPath,
		}
		const v2: ReportTemplate<{ v: number }> = {
			...v1,
			title: "Version 2",
		}

		registerTemplate(v1)
		registerTemplate(v2)

		const found = getTemplate("overwrite-test")
		assert.ok(found !== undefined)
		assert.equal(found.title, "Version 2")
	})
})
