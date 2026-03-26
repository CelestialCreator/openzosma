import { runStreaming } from "../utils/exec.js"

/**
 * Run pnpm install in the project directory.
 */
export const installDependencies = async (projectDir: string): Promise<void> => {
	await runStreaming("Installing dependencies", "pnpm install", {
		cwd: projectDir,
		timeout: 300_000, // 5 minutes
	})
}
