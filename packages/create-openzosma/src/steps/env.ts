import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { note } from "@clack/prompts"
import type { SetupConfig } from "../constants.js"
import { DEFAULT_PORTS } from "../constants.js"

/**
 * Generate and write .env.local from the collected setup configuration.
 */
export const writeEnvFile = (config: SetupConfig): void => {
	const lines: string[] = []

	const add = (comment: string, entries: [string, string][]) => {
		lines.push(`# ${comment}`)
		for (const [key, value] of entries) {
			lines.push(`${key}=${value}`)
		}
		lines.push("")
	}

	// Database
	const dbUrl = `postgresql://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}`
	add("-- Database --", [
		["DB_HOST", config.db.host],
		["DB_PORT", config.db.port],
		["DB_NAME", config.db.name],
		["DB_USER", config.db.user],
		["DB_PASS", config.db.password],
		["DB_POOL_SIZE", "20"],
		["DATABASE_URL", dbUrl],
	])

	// Valkey / RabbitMQ (defaults, not yet implemented)
	add("-- Valkey / Redis (not yet implemented) --", [["VALKEY_URL", "redis://localhost:6379"]])
	add("-- RabbitMQ (not yet implemented) --", [["RABBITMQ_URL", "amqp://openzosma:openzosma@localhost:5672"]])

	// Web App
	add("-- Web App --", [
		["NEXT_PUBLIC_BASE_URL", `http://localhost:${DEFAULT_PORTS.web}`],
		["NEXT_PUBLIC_GATEWAY_URL", `http://localhost:${DEFAULT_PORTS.gateway}`],
	])

	// Auth
	const authEntries: [string, string][] = [
		["AUTH_SECRET", config.authSecret],
		["AUTH_URL", `http://localhost:${DEFAULT_PORTS.web}`],
		["ENCRYPTION_KEY", config.encryptionKey],
	]
	if (config.googleOAuth) {
		authEntries.push(["GOOGLE_CLIENT_ID", config.googleOAuth.clientId])
		authEntries.push(["GOOGLE_CLIENT_SECRET", config.googleOAuth.clientSecret])
	}
	if (config.githubOAuth) {
		authEntries.push(["GITHUB_CLIENT_ID", config.githubOAuth.clientId])
		authEntries.push(["GITHUB_CLIENT_SECRET", config.githubOAuth.clientSecret])
	}
	add("-- Auth --", authEntries)

	// Gateway
	add("-- Gateway --", [
		["GATEWAY_PORT", DEFAULT_PORTS.gateway],
		["GATEWAY_HOST", "0.0.0.0"],
		["PUBLIC_URL", `http://localhost:${DEFAULT_PORTS.gateway}`],
	])

	// Agent / Provider
	if (config.localModel) {
		add("-- Local Model --", [
			["OPENZOSMA_LOCAL_MODEL_URL", config.localModel.url],
			["OPENZOSMA_LOCAL_MODEL_ID", config.localModel.id],
			["OPENZOSMA_LOCAL_MODEL_NAME", config.localModel.name ?? ""],
			["OPENZOSMA_LOCAL_MODEL_API_KEY", config.localModel.apiKey],
			["OPENZOSMA_LOCAL_MODEL_CONTEXT_WINDOW", config.localModel.contextWindow],
			["OPENZOSMA_LOCAL_MODEL_MAX_TOKENS", config.localModel.maxTokens],
		])
	} else {
		add("-- Agent --", [
			["OPENZOSMA_MODEL_PROVIDER", config.provider],
			["OPENZOSMA_MODEL_ID", config.providerModel],
		])
	}

	add("-- Workspace --", [["OPENZOSMA_WORKSPACE", "./workspace"]])

	// LLM API keys
	const keyEntries: [string, string][] = []
	if (config.provider === "openai") {
		keyEntries.push(["OPENAI_API_KEY", config.providerApiKey])
	} else if (config.provider === "anthropic") {
		keyEntries.push(["ANTHROPIC_API_KEY", config.providerApiKey])
	} else if (config.provider !== "local") {
		// For other providers, use the provider-specific env key
		const envKey = config.provider.toUpperCase()
		keyEntries.push([`${envKey}_API_KEY`, config.providerApiKey])
	}
	if (config.perplexityApiKey) {
		keyEntries.push(["PERPLEXITY_API_KEY", config.perplexityApiKey])
	}
	if (config.geminiApiKey) {
		keyEntries.push(["GEMINI_API_KEY", config.geminiApiKey])
	}
	if (keyEntries.length > 0) {
		add("-- LLM Provider Keys --", keyEntries)
	}

	// Sandbox
	const sandboxEntries: [string, string][] = [["OPENZOSMA_SANDBOX_MODE", config.sandboxMode]]
	if (config.sandboxMode === "orchestrator" && config.sandboxImage) {
		sandboxEntries.push(["SANDBOX_IMAGE", config.sandboxImage])
		sandboxEntries.push(["SANDBOX_POLICY_PATH", "infra/openshell/policies/default.yaml"])
	}
	add("-- Sandbox --", sandboxEntries)

	const content = lines.join("\n")
	const envPath = join(config.projectDir, ".env.local")
	writeFileSync(envPath, content, "utf-8")

	// Show summary
	const providerLabel = config.localModel
		? `Local (${config.localModel.id})`
		: `${config.provider} (${config.providerModel})`

	const summaryLines = [
		`  Provider:     ${providerLabel}`,
		`  Database:     ${config.db.host}:${config.db.port}/${config.db.name}`,
		`  Sandbox:      ${config.sandboxMode}`,
		`  OAuth:        ${[config.googleOAuth ? "Google" : null, config.githubOAuth ? "GitHub" : null].filter(Boolean).join(", ") || "none"}`,
		`  Gateway:      http://localhost:${DEFAULT_PORTS.gateway}`,
		`  Dashboard:    http://localhost:${DEFAULT_PORTS.web}`,
	]
	note(summaryLines.join("\n"), "Configuration written to .env.local")
}
