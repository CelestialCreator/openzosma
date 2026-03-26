import path from "node:path"
import { KNOWLEDGE_BASE_PATH } from "./constants"

/**
 * Resolve a user-supplied relative path within the knowledge base root directory.
 * Returns the absolute path if it stays within KNOWLEDGE_BASE_PATH, or null if
 * the resolved path escapes the root (e.g. via path traversal like "../../etc/passwd").
 */
export const resolveSafe = (userPath: string): string | null => {
	const resolved = path.resolve(KNOWLEDGE_BASE_PATH, userPath)
	if (!resolved.startsWith(path.resolve(KNOWLEDGE_BASE_PATH))) return null
	return resolved
}
