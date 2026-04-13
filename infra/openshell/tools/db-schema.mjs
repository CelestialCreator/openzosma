#!/usr/bin/env node
// =============================================================================
// db-schema — Introspect tables and columns of a database integration.
//
// Reads credentials from DB_* environment variables injected by the orchestrator.
// Supports PostgreSQL and MySQL.
//
// Usage:
//   db-schema
//   db-schema --integration 2
//   db-schema --integration my-pg-db
//   db-schema --json
// =============================================================================
import { parseArgs } from "node:util"

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
const { values } = parseArgs({
	options: {
		integration: { type: "string", short: "i", default: "" },
		json: { type: "boolean", short: "j", default: false },
		help: { type: "boolean", short: "h", default: false },
	},
	allowPositionals: false,
})

if (values.help) {
	console.log(`Usage: db-schema [--integration <name-or-index>] [--json]

Options:
  -i, --integration  Integration name or index (default: 1)
  -j, --json         Output raw JSON instead of formatted text
  -h, --help         Show this help

Environment:
  Reads DB_COUNT and DB_* / DB_N_* env vars injected by the orchestrator.`)
	process.exit(0)
}

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

	if (hint && /^\d+$/.test(hint)) {
		const idx = Number(hint)
		if (idx < 1 || idx > dbCount) return null
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
// Schema introspection
// ---------------------------------------------------------------------------
async function schemaPg(config) {
	const pg = await import("pg")
	const pool = new pg.default.Pool({
		host: config.host,
		port: config.port,
		database: config.database,
		user: config.username,
		password: config.password,
		ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
		connectionTimeoutMillis: 10_000,
	})
	try {
		const client = await pool.connect()
		try {
			const result = await client.query(
				`SELECT t.table_name, c.column_name, c.data_type, c.is_nullable
				 FROM information_schema.tables t
				 JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
				 WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
				   AND t.table_type = 'BASE TABLE'
				 ORDER BY t.table_name, c.ordinal_position`,
			)
			const tableMap = new Map()
			for (const row of result.rows) {
				if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, [])
				tableMap.get(row.table_name).push({
					column_name: row.column_name,
					data_type: row.data_type,
					is_nullable: row.is_nullable,
				})
			}
			return Array.from(tableMap.entries()).map(([table_name, columns]) => ({ table_name, columns }))
		} finally {
			client.release()
		}
	} finally {
		await pool.end()
	}
}

async function schemaMysql(config) {
	const mysql = await import("mysql2/promise")
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
		const [rows] = await connection.query(
			`SELECT LOWER(t.TABLE_NAME) AS table_name,
			        LOWER(c.COLUMN_NAME) AS column_name,
			        LOWER(c.DATA_TYPE) AS data_type,
			        c.IS_NULLABLE AS is_nullable
			 FROM information_schema.TABLES t
			 JOIN information_schema.COLUMNS c
			   ON c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = t.TABLE_SCHEMA
			 WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
			 ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION`,
		)
		const tableMap = new Map()
		for (const row of rows) {
			if (!tableMap.has(row.table_name)) tableMap.set(row.table_name, [])
			tableMap.get(row.table_name).push({
				column_name: row.column_name,
				data_type: row.data_type,
				is_nullable: row.is_nullable,
			})
		}
		return Array.from(tableMap.entries()).map(([table_name, columns]) => ({ table_name, columns }))
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

let tables
try {
	switch (integration.type) {
		case "postgresql":
			tables = await schemaPg(integration)
			break
		case "mysql":
			tables = await schemaMysql(integration)
			break
		default:
			console.error(JSON.stringify({ success: false, error: `Unsupported database type: ${integration.type}` }))
			process.exit(1)
	}
} catch (err) {
	console.error(JSON.stringify({ success: false, error: err.message }))
	process.exit(1)
}

if (values.json) {
	console.log(JSON.stringify({ success: true, database: integration.name, type: integration.type, tables }, null, 2))
} else {
	// Human-readable output
	console.log(`Database: ${integration.name} (${integration.type})`)
	console.log()
	if (tables.length === 0) {
		console.log("No tables found.")
	} else {
		for (const table of tables) {
			console.log(`Table: ${table.table_name}`)
			for (const col of table.columns) {
				const nullable = col.is_nullable === "YES" ? " (nullable)" : ""
				console.log(`  ${col.column_name}: ${col.data_type}${nullable}`)
			}
			console.log()
		}
		console.log(`${tables.length} table(s) found.`)
	}
}
