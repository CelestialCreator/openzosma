import { spinner } from "@clack/prompts"
import { type Options as ExecaOptions, execaCommand } from "execa"
import pc from "picocolors"

/**
 * Run a shell command with a clack spinner, streaming output on failure.
 * Returns the execa result on success, throws on failure with formatted output.
 */
export const run = async (
	label: string,
	command: string,
	opts?: { cwd?: string; timeout?: number },
): Promise<string> => {
	const s = spinner()
	s.start(label)

	const execOpts: ExecaOptions = {
		cwd: opts?.cwd,
		timeout: opts?.timeout,
		reject: false,
		shell: true,
	}

	const result = await execaCommand(command, execOpts)

	if (result.exitCode !== 0) {
		s.stop(`${label} ${pc.red("failed")}`)
		const stderr = result.stderr?.toString().trim()
		const stdout = result.stdout?.toString().trim()
		const output = stderr || stdout || "No output"
		throw new Error(`Command failed: ${command}\n${output}`)
	}

	s.stop(`${label} ${pc.green("done")}`)
	return result.stdout?.toString().trim() ?? ""
}

/**
 * Run a command silently and return stdout, or null on failure.
 * Used for prerequisite checks where we just need the version string.
 */
export const tryCommand = async (command: string, opts?: { cwd?: string }): Promise<string | null> => {
	try {
		const result = await execaCommand(command, {
			cwd: opts?.cwd,
			reject: false,
			shell: true,
			timeout: 10_000,
		})
		if (result.exitCode !== 0) return null
		return result.stdout?.toString().trim() ?? ""
	} catch {
		return null
	}
}

/**
 * Run a command and stream its output directly to the terminal.
 * Used for long-running processes like pnpm install and build.
 */
export const runStreaming = async (
	label: string,
	command: string,
	opts?: { cwd?: string; timeout?: number },
): Promise<void> => {
	const s = spinner()
	s.start(label)

	const result = await execaCommand(command, {
		cwd: opts?.cwd,
		timeout: opts?.timeout ?? 600_000,
		reject: false,
		shell: true,
	})

	if (result.exitCode !== 0) {
		s.stop(`${label} ${pc.red("failed")}`)
		const stderr = result.stderr?.toString().trim()
		const stdout = result.stdout?.toString().trim()
		const output = stderr || stdout || "No output"
		throw new Error(`Command failed: ${command}\n${output}`)
	}

	s.stop(`${label} ${pc.green("done")}`)
}
