import { runStreaming } from "../utils/exec.js"

/**
 * Build all packages via Turborepo.
 */
export const buildProject = async (projectDir: string): Promise<void> => {
	await runStreaming("Building project", "pnpm run build", {
		cwd: projectDir,
		timeout: 300_000, // 5 minutes
	})
}
