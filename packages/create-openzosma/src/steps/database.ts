import { cancel, isCancel, select, text } from "@clack/prompts"
import { DEFAULT_DB } from "../constants.js"
import { validatePositiveInt } from "../utils/validate.js"

export interface DatabaseConfig {
	host: string
	port: string
	name: string
	user: string
	password: string
}

/**
 * Prompt the user for database configuration.
 * Offers defaults that match docker-compose.yml or a custom connection.
 */
export const configureDatabase = async (): Promise<DatabaseConfig> => {
	const choice = await select({
		message: "Database configuration",
		options: [
			{
				value: "defaults",
				label: "Use defaults",
				hint: `${DEFAULT_DB.user}:***@${DEFAULT_DB.host}:${DEFAULT_DB.port}/${DEFAULT_DB.name}`,
			},
			{
				value: "custom",
				label: "Custom connection",
			},
		],
	})

	if (isCancel(choice)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	if (choice === "defaults") {
		return { ...DEFAULT_DB }
	}

	const host = await text({
		message: "Database host",
		placeholder: DEFAULT_DB.host,
		defaultValue: DEFAULT_DB.host,
	})
	if (isCancel(host)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const port = await text({
		message: "Database port",
		placeholder: DEFAULT_DB.port,
		defaultValue: DEFAULT_DB.port,
		validate: validatePositiveInt,
	})
	if (isCancel(port)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const name = await text({
		message: "Database name",
		placeholder: DEFAULT_DB.name,
		defaultValue: DEFAULT_DB.name,
	})
	if (isCancel(name)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const user = await text({
		message: "Database user",
		placeholder: DEFAULT_DB.user,
		defaultValue: DEFAULT_DB.user,
	})
	if (isCancel(user)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const pass = await text({
		message: "Database password",
		placeholder: DEFAULT_DB.password,
		defaultValue: DEFAULT_DB.password,
	})
	if (isCancel(pass)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	return {
		host: host.trim() || DEFAULT_DB.host,
		port: port.trim() || DEFAULT_DB.port,
		name: name.trim() || DEFAULT_DB.name,
		user: user.trim() || DEFAULT_DB.user,
		password: pass.trim() || DEFAULT_DB.password,
	}
}
