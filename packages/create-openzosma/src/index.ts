#!/usr/bin/env node
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { runPipeline } from "./pipeline.js"

/**
 * Entry point for the create-openzosma CLI.
 *
 * Modes:
 *   - Fresh install:  `pnpm create openzosma` / `npx create-openzosma`
 *   - Post-clone:     `pnpm setup` (from repo root, passes --post-clone)
 */
const main = async (): Promise<void> => {
	const args = process.argv.slice(2)
	const postClone = args.includes("--post-clone")

	// Auto-detect post-clone mode: if we're inside an existing openzosma repo
	const autoDetect =
		!postClone &&
		existsSync(resolve("package.json")) &&
		existsSync(resolve("pnpm-workspace.yaml")) &&
		existsSync(resolve(".env.example"))

	await runPipeline(postClone || autoDetect)
}

main().catch((err) => {
	console.error("Fatal error:", err)
	process.exit(1)
})
