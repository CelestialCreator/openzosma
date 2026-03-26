import { log, spinner } from "@clack/prompts"
import { execaCommand } from "execa"
import pc from "picocolors"

/**
 * Start Docker Compose services and wait for healthchecks.
 * Skips the postgres service if using an external database (non-localhost).
 */
export const startDocker = async (projectDir: string, dbHost: string): Promise<void> => {
	const isExternalDb = dbHost !== "localhost" && dbHost !== "127.0.0.1"

	const s = spinner()
	s.start("Starting Docker services")

	// Build the compose command -- if external DB, only start valkey + rabbitmq
	const services = isExternalDb ? "valkey rabbitmq" : ""
	const composeCmd = `docker compose up -d ${services}`.trim()

	const result = await execaCommand(composeCmd, {
		cwd: projectDir,
		reject: false,
		shell: true,
	})

	if (result.exitCode !== 0) {
		s.stop(`Starting Docker services ${pc.red("failed")}`)
		throw new Error(`docker compose failed:\n${result.stderr?.toString().trim() || result.stdout?.toString().trim()}`)
	}

	s.stop(`Starting Docker services ${pc.green("done")}`)

	// Wait for services to become healthy
	const servicesToCheck = isExternalDb ? ["valkey", "rabbitmq"] : ["postgres", "valkey", "rabbitmq"]

	for (const service of servicesToCheck) {
		await waitForHealthy(projectDir, service)
	}
}

const waitForHealthy = async (projectDir: string, service: string, timeoutMs = 60_000): Promise<void> => {
	const s = spinner()
	s.start(`Waiting for ${service}`)

	const start = Date.now()

	while (Date.now() - start < timeoutMs) {
		const result = await execaCommand(`docker compose ps --format json ${service}`, {
			cwd: projectDir,
			reject: false,
			shell: true,
		})

		if (result.exitCode === 0 && result.stdout) {
			try {
				// docker compose ps --format json may return one JSON object per line
				const lines = result.stdout.toString().trim().split("\n")
				for (const line of lines) {
					const info = JSON.parse(line)
					if (info.Health === "healthy" || info.State === "running") {
						s.stop(`${service} ${pc.green("healthy")}`)
						return
					}
				}
			} catch {
				// JSON parse failed, continue polling
			}
		}

		await sleep(2000)
	}

	s.stop(`${service} ${pc.yellow("timeout")}`)
	log.warn(`${service} did not become healthy within ${timeoutMs / 1000}s. Continuing anyway.`)
}

const sleep = (ms: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
