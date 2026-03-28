import { existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { cancel, isCancel, select, text } from "@clack/prompts"
import { REPO_TARBALL_URL, REPO_URL } from "../constants.js"
import { run } from "../utils/exec.js"

/**
 * Ask where to create the project and whether to clone or download.
 * Returns the resolved absolute path to the project directory.
 * Skipped entirely in post-clone mode.
 */
export const setupProject = async (): Promise<string> => {
	const dirAnswer = await text({
		message: "Where should we create your project?",
		placeholder: "./openzosma",
		defaultValue: "./openzosma",
		validate: (value) => {
			const resolved = resolve(value.trim() || "./openzosma")
			if (existsSync(resolved)) {
				try {
					const entries = readdirSync(resolved)
					if (entries.length > 0) {
						return "Directory is not empty. Choose a different location."
					}
				} catch {
					return "Cannot read directory."
				}
			}
			return undefined
		},
	})

	if (isCancel(dirAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const projectDir = resolve(dirAnswer.trim() || "./openzosma")

	const method = await select({
		message: "How would you like to get the project?",
		options: [
			{
				value: "clone",
				label: "Clone with git",
				hint: "can pull updates later",
			},
			{
				value: "tarball",
				label: "Download release",
				hint: "clean start, no upstream link",
			},
		],
	})

	if (isCancel(method)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	if (method === "clone") {
		await run("Cloning repository", `git clone --depth 1 ${REPO_URL} "${projectDir}"`)
	} else {
		await run(
			"Downloading release",
			`mkdir -p "${projectDir}" && curl -sL ${REPO_TARBALL_URL} | tar xz --strip-components=1 -C "${projectDir}"`,
		)
	}

	return projectDir
}
