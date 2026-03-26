import { cancel, confirm, isCancel, note, outro } from "@clack/prompts"
import { execaCommand } from "execa"
import pc from "picocolors"
import { DEFAULT_PORTS } from "../constants.js"

/**
 * Show the final summary and optionally start gateway + web.
 */
export const finish = async (projectDir: string, postClone: boolean): Promise<void> => {
	const startNow = await confirm({
		message: "Start the gateway and dashboard now?",
		initialValue: true,
	})

	if (isCancel(startNow)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	if (startNow) {
		// Start gateway and web as detached child processes
		const gatewayProc = execaCommand("pnpm --filter @openzosma/gateway dev", {
			cwd: projectDir,
			shell: true,
			detached: true,
			stdio: "ignore",
		})
		gatewayProc.unref()

		const webProc = execaCommand("pnpm --filter @openzosma/web dev", {
			cwd: projectDir,
			shell: true,
			detached: true,
			stdio: "ignore",
		})
		webProc.unref()

		// Wait briefly for processes to start
		await sleep(3000)

		// Check if ports are listening
		const gatewayUp = await isPortListening(Number(DEFAULT_PORTS.gateway))
		const webUp = await isPortListening(Number(DEFAULT_PORTS.web))

		const statusLines = [
			`  Gateway:    http://localhost:${DEFAULT_PORTS.gateway} ${gatewayUp ? pc.green("(running)") : pc.yellow("(starting...)")}`,
			`  Dashboard:  http://localhost:${DEFAULT_PORTS.web} ${webUp ? pc.green("(running)") : pc.yellow("(starting...)")}`,
			"",
			"  Sign up at the dashboard to get started.",
			"",
			"  Stop with: kill the background processes or restart your terminal.",
		]
		note(statusLines.join("\n"), "OpenZosma is running")
	} else {
		const cdCmd = postClone ? "" : `  cd ${projectDir}\n`
		const nextSteps = [
			cdCmd,
			"  pnpm --filter @openzosma/gateway dev   # Terminal 1 (port 4000)",
			"  pnpm --filter @openzosma/web dev       # Terminal 2 (port 3000)",
			"",
			"  Open http://localhost:3000",
		]
			.filter((l) => l !== "")
			.join("\n")
		note(nextSteps, "Next steps")
	}

	outro(pc.green("OpenZosma is ready!"))
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms)
	})

const isPortListening = async (port: number): Promise<boolean> => {
	try {
		const result = await execaCommand(`lsof -i :${port} -sTCP:LISTEN`, {
			reject: false,
			shell: true,
			timeout: 5000,
		})
		return result.exitCode === 0
	} catch {
		return false
	}
}
