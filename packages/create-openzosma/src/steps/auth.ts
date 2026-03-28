import { cancel, isCancel, log, multiselect, text } from "@clack/prompts"
import { generateAuthSecret, generateEncryptionKey } from "../utils/crypto.js"

export interface AuthConfig {
	authSecret: string
	encryptionKey: string
	googleOAuth?: { clientId: string; clientSecret: string }
	githubOAuth?: { clientId: string; clientSecret: string }
}

/**
 * Configure authentication: auto-generate secrets and optionally set up OAuth providers.
 */
export const configureAuth = async (): Promise<AuthConfig> => {
	const authSecret = generateAuthSecret()
	const encryptionKey = generateEncryptionKey()

	log.info("Generated AUTH_SECRET and ENCRYPTION_KEY (saved to .env.local).")

	const oauthChoice = await multiselect({
		message: "Configure OAuth providers? (for dashboard login)",
		options: [
			{ value: "google", label: "Google OAuth" },
			{ value: "github", label: "GitHub OAuth" },
			{ value: "skip", label: "Skip", hint: "email/password only" },
		],
		required: true,
	})

	if (isCancel(oauthChoice)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const choices = oauthChoice as string[]

	// If skip is selected alongside others, just skip
	if (choices.includes("skip") || choices.length === 0) {
		return { authSecret, encryptionKey }
	}

	let googleOAuth: { clientId: string; clientSecret: string } | undefined
	let githubOAuth: { clientId: string; clientSecret: string } | undefined

	if (choices.includes("google")) {
		const clientId = await text({
			message: "Google OAuth Client ID",
			validate: (v) => (v.trim().length === 0 ? "Client ID is required" : undefined),
		})
		if (isCancel(clientId)) {
			cancel("Setup cancelled.")
			process.exit(0)
		}

		const clientSecret = await text({
			message: "Google OAuth Client Secret",
			validate: (v) => (v.trim().length === 0 ? "Client Secret is required" : undefined),
		})
		if (isCancel(clientSecret)) {
			cancel("Setup cancelled.")
			process.exit(0)
		}

		googleOAuth = { clientId: clientId.trim(), clientSecret: clientSecret.trim() }
	}

	if (choices.includes("github")) {
		const clientId = await text({
			message: "GitHub OAuth Client ID",
			validate: (v) => (v.trim().length === 0 ? "Client ID is required" : undefined),
		})
		if (isCancel(clientId)) {
			cancel("Setup cancelled.")
			process.exit(0)
		}

		const clientSecret = await text({
			message: "GitHub OAuth Client Secret",
			validate: (v) => (v.trim().length === 0 ? "Client Secret is required" : undefined),
		})
		if (isCancel(clientSecret)) {
			cancel("Setup cancelled.")
			process.exit(0)
		}

		githubOAuth = { clientId: clientId.trim(), clientSecret: clientSecret.trim() }
	}

	return { authSecret, encryptionKey, googleOAuth, githubOAuth }
}
