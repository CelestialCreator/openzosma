#!/usr/bin/env node
// =============================================================================
// db-query — Execute read-only SQL against a database integration.
//
// Reads credentials from DB_* environment variables injected by the orchestrator.
// Supports PostgreSQL and MySQL. Enforces read-only guardrails.
//
// Usage:
//   db-query "SELECT * FROM users LIMIT 10"
//   db-query --integration 2 "SELECT count(*) FROM orders"
//   db-query --integration my-pg-db "SELECT * FROM products"
// =============================================================================
import { parseArgs } from "node:util"

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const { values, positionals } = parseArgs({
	options: {
		integration: { type: "string", short: "i", default: "" },
		help: { type: "boolean", short: "h", default: false },
	},
	allowPositionals: true,
})

if (values.help || positionals.length === 0) {
	console.log(`Usage: db-query [--integration <name-or-index>] "<SQL>"

Options:
  -i, --integration  Integration name or index (default: 1)
  -h, --help         Show this help

Environment:
  Reads DB_COUNT and DB_* / DB_N_* env vars injected by the orchestrator.

Guardrails:
  - Only SELECT, WITH...SELECT, and EXPLAIN queries are allowed
  - Results are auto-limited to 1000 rows
  - Queries timeout after 30 seconds`)
	process.exit(0)
}

const sql = positionals.join(" ")

// ---------------------------------------------------------------------------
// Resolve integration credentials from env vars
// ---------------------------------------------------------------------------
const dbCount = Number(process.env.DB_COUNT || "0")
if (dbCount === 0) {
	console.error(
		JSON.stringify({ success: false, error: "No database integrations configured. Add one via the dashboard." }),
	)
	process.exit(1)
}

function getEnv(prefix, key) {
	return process.env[`${prefix}_${key}`] || ""
}

function resolveIntegration(hint) {
	if (dbCount === 1) {
		const prefix = "DB"
		return {
			type: getEnv(prefix, "TYPE"),
			host: getEnv(prefix, "HOST"),
			port: Number(getEnv(prefix, "PORT") || "5432"),
			database: getEnv(prefix, "NAME"),
			username: getEnv(prefix, "USER"),
			password: getEnv(prefix, "PASS"),
			ssl: getEnv(prefix, "SSL") === "true",
			name: getEnv(prefix, "INTEGRATION_NAME"),
		}
	}

	// Multiple integrations — resolve by index or name
	if (hint && /^\d+$/.test(hint)) {
		const idx = Number(hint)
		if (idx < 1 || idx > dbCount) {
			return null
		}
		const prefix = `DB_${idx}`
		return {
			type: getEnv(prefix, "TYPE"),
			host: getEnv(prefix, "HOST"),
			port: Number(getEnv(prefix, "PORT") || "5432"),
			database: getEnv(prefix, "NAME"),
			username: getEnv(prefix, "USER"),
			password: getEnv(prefix, "PASS"),
			ssl: getEnv(prefix, "SSL") === "true",
			name: getEnv(prefix, "INTEGRATION_NAME"),
		}
	}

	// Search by name
	for (let i = 1; i <= dbCount; i++) {
		const prefix = `DB_${i}`
		const name = getEnv(prefix, "INTEGRATION_NAME")
		if (name === hint) {
			return {
				type: getEnv(prefix, "TYPE"),
				host: getEnv(prefix, "HOST"),
				port: Number(getEnv(prefix, "PORT") || "5432"),
				database: getEnv(prefix, "NAME"),
				username: getEnv(prefix, "USER"),
				password: getEnv(prefix, "PASS"),
				ssl: getEnv(prefix, "SSL") === "true",
				name,
			}
		}
	}

	// Default to first
	if (!hint) {
		const prefix = "DB_1"
		return {
			type: getEnv(prefix, "TYPE"),
			host: getEnv(prefix, "HOST"),
			port: Number(getEnv(prefix, "PORT") || "5432"),
			database: getEnv(prefix, "NAME"),
			username: getEnv(prefix, "USER"),
			password: getEnv(prefix, "PASS"),
			ssl: getEnv(prefix, "SSL") === "true",
			name: getEnv(prefix, "INTEGRATION_NAME"),
		}
	}

	return null
}

// ---------------------------------------------------------------------------
// Query guardrails
// ---------------------------------------------------------------------------
const BLOCKED_KEYWORDS = [
	"INSERT",
	"UPDATE",
	"DELETE",
	"DROP",
	"ALTER",
	"CREATE",
	"TRUNCATE",
	"GRANT",
	"REVOKE",
	"EXEC",
	"EXECUTE",
]

function isReadOnly(query) {
	const normalized = query.trim().toUpperCase()
	return !BLOCKED_KEYWORDS.some((kw) => normalized.startsWith(kw) || normalized.includes(` ${kw} `))
}

function ensafeLimit(query, maxRows = 1000) {
	const upper = query.trim().toUpperCase()
	if (upper.includes("LIMIT")) return query
	return `${query.trimEnd()}\nLIMIT ${maxRows}`
}

// ---------------------------------------------------------------------------
// Query execution
// ---------------------------------------------------------------------------
const QUERY_TIMEOUT_MS = 30_000

async function queryPostgresql(config, query) {
	const pg = await import("pg")
	const pool = new pg.default.Pool({
		host: config.host,
		port: config.port,
		database: config.database,
		user: config.username,
		password: config.password,
		ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
		connectionTimeoutMillis: 10_000,
		statement_timeout: QUERY_TIMEOUT_MS,
	})
	const start = Date.now()
	try {
		const client = await pool.connect()
		try {
			await client.query("BEGIN TRANSACTION READ ONLY")
			const result = await client.query(query)
			await client.query("COMMIT")
			return {
				success: true,
				rows: result.rows,
				fields: result.fields?.map((f) => f.name) ?? [],
				rowCount: result.rowCount ?? result.rows?.length ?? 0,
				latencyMs: Date.now() - start,
			}
		} catch (err) {
			await client.query("ROLLBACK").catch(() => {})
			throw err
		} finally {
			client.release()
		}
	} catch (err) {
		return { success: false, error: err.message, latencyMs: Date.now() - start }
	} finally {
		await pool.end()
	}
}

async function queryMysql(config, query) {
	const mysql = await import("mysql2/promise")
	const start = Date.now()
	let connection = null
	try {
		connection = await mysql.createConnection({
			host: config.host,
			port: config.port,
			database: config.database,
			user: config.username,
			password: config.password,
			ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
			connectTimeout: 10_000,
		})
		await connection.query(`SET SESSION MAX_EXECUTION_TIME = ${QUERY_TIMEOUT_MS}`)
		await connection.query("SET SESSION TRANSACTION READ ONLY")
		await connection.query("START TRANSACTION")
		const [rows, fields] = await connection.query(query)
		await connection.query("COMMIT")
		const rowArray = Array.isArray(rows) ? rows : []
		return {
			success: true,
			rows: rowArray,
			fields: Array.isArray(fields) ? fields.map((f) => f.name) : [],
			rowCount: rowArray.length,
			latencyMs: Date.now() - start,
		}
	} catch (err) {
		if (connection) await connection.query("ROLLBACK").catch(() => {})
		return { success: false, error: err.message, latencyMs: Date.now() - start }
	} finally {
		if (connection) await connection.end()
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const integration = resolveIntegration(values.integration)
if (!integration) {
	console.error(JSON.stringify({ success: false, error: `Integration not found: ${values.integration}` }))
	process.exit(1)
}

if (!isReadOnly(sql)) {
	console.error(
		JSON.stringify({ success: false, error: "Only read-only queries are allowed (SELECT, WITH...SELECT, EXPLAIN)" }),
	)
	process.exit(1)
}

const safeQuery = ensafeLimit(sql)

let result
switch (integration.type) {
	case "postgresql":
		result = await queryPostgresql(integration, safeQuery)
		break
	case "mysql":
		result = await queryMysql(integration, safeQuery)
		break
	default:
		result = { success: false, error: `Unsupported database type: ${integration.type}` }
}

if (result.success) {
	console.log(
		JSON.stringify(
			{
				success: true,
				database: integration.name,
				type: integration.type,
				rowCount: result.rowCount,
				latencyMs: result.latencyMs,
				fields: result.fields,
				rows: result.rows,
			},
			null,
			2,
		),
	)
} else {
	console.error(JSON.stringify({ success: false, error: result.error, latencyMs: result.latencyMs }))
	process.exit(1)
}
