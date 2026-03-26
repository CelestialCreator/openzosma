import { runStreaming } from "../utils/exec.js"

/**
 * Run database migrations in the correct order:
 * 1. Schema migrations (pnpm db:migrate)
 * 2. Auth table migrations (pnpm db:migrate:auth)
 */
export const runMigrations = async (projectDir: string): Promise<void> => {
	await runStreaming("Running database migrations", "pnpm db:migrate", {
		cwd: projectDir,
		timeout: 60_000,
	})

	await runStreaming("Running auth migrations", "pnpm db:migrate:auth", {
		cwd: projectDir,
		timeout: 60_000,
	})
}
