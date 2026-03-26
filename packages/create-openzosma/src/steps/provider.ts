import { cancel, isCancel, password, select } from "@clack/prompts"
import { PROVIDERS } from "../constants.js"
import { validateApiKey } from "../utils/validate.js"

interface ProviderResult {
	provider: string
	model: string
	apiKey: string
	envKey: string
	isLocalModel: boolean
}

/**
 * Prompt the user to select an LLM provider and enter their API key.
 * Returns provider name, default model, and validated API key.
 */
export const configureProvider = async (): Promise<ProviderResult> => {
	const options = [
		...PROVIDERS.map((p) => ({
			value: p.value,
			label: `${p.name}`,
			hint: p.description,
		})),
		{
			value: "local",
			label: "Local model",
			hint: "Ollama, llama.cpp, vLLM, LM Studio",
		},
	]

	const providerAnswer = await select({
		message: "Select your LLM provider",
		options,
	})

	if (isCancel(providerAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	if (providerAnswer === "local") {
		return {
			provider: "local",
			model: "",
			apiKey: "",
			envKey: "",
			isLocalModel: true,
		}
	}

	const provider = PROVIDERS.find((p) => p.value === providerAnswer)
	if (!provider) {
		throw new Error(`Unknown provider: ${providerAnswer}`)
	}

	const apiKeyAnswer = await password({
		message: `Enter your ${provider.name} API key`,
		validate: (value) => validateApiKey(provider.value, value),
	})

	if (isCancel(apiKeyAnswer)) {
		cancel("Setup cancelled.")
		process.exit(0)
	}

	return {
		provider: provider.value,
		model: provider.defaultModel,
		apiKey: apiKeyAnswer.trim(),
		envKey: provider.envKey,
		isLocalModel: false,
	}
}
