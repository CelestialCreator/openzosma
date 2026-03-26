import { cancel, isCancel, text } from "@clack/prompts"
import { LOCAL_MODEL_DEFAULTS } from "../constants.js"
import { validatePositiveInt, validateUrl } from "../utils/validate.js"

export interface LocalModelConfig {
	url: string
	id: string
	name?: string
	apiKey: string
	contextWindow: string
	maxTokens: string
}

/**
 * Prompt the user to configure a local OpenAI-compatible model server.
 * Called when the user selects "Local model" as their provider.
 */
export const configureLocalModel = async (): Promise<LocalModelConfig> => {
	const urlAnswer = await text({
		message: "Local model server URL",
		placeholder: "http://localhost:11434/v1",
		validate: validateUrl,
	})
	if (isCancel(urlAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const idAnswer = await text({
		message: "Model ID",
		placeholder: LOCAL_MODEL_DEFAULTS.id,
		defaultValue: LOCAL_MODEL_DEFAULTS.id,
	})
	if (isCancel(idAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const nameAnswer = await text({
		message: "Display name (optional)",
		placeholder: `Local (${idAnswer.trim() || LOCAL_MODEL_DEFAULTS.id})`,
		defaultValue: "",
	})
	if (isCancel(nameAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const apiKeyAnswer = await text({
		message: "API key (use 'dummy' if none required)",
		placeholder: LOCAL_MODEL_DEFAULTS.apiKey,
		defaultValue: LOCAL_MODEL_DEFAULTS.apiKey,
	})
	if (isCancel(apiKeyAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const ctxAnswer = await text({
		message: "Context window (tokens)",
		placeholder: LOCAL_MODEL_DEFAULTS.contextWindow,
		defaultValue: LOCAL_MODEL_DEFAULTS.contextWindow,
		validate: validatePositiveInt,
	})
	if (isCancel(ctxAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	const maxAnswer = await text({
		message: "Max output tokens",
		placeholder: LOCAL_MODEL_DEFAULTS.maxTokens,
		defaultValue: LOCAL_MODEL_DEFAULTS.maxTokens,
		validate: validatePositiveInt,
	})
	if (isCancel(maxAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	return {
		url: urlAnswer.trim(),
		id: idAnswer.trim() || LOCAL_MODEL_DEFAULTS.id,
		name: nameAnswer.trim() || undefined,
		apiKey: apiKeyAnswer.trim() || LOCAL_MODEL_DEFAULTS.apiKey,
		contextWindow: ctxAnswer.trim() || LOCAL_MODEL_DEFAULTS.contextWindow,
		maxTokens: maxAnswer.trim() || LOCAL_MODEL_DEFAULTS.maxTokens,
	}
}
