/**
 * Validate API key format for each provider.
 * Returns an error message if invalid, undefined if valid.
 */
export const validateApiKey = (provider: string, key: string): string | undefined => {
	const trimmed = key.trim()
	if (trimmed.length === 0) {
		return "API key cannot be empty"
	}

	switch (provider) {
		case "anthropic":
			if (!trimmed.startsWith("sk-ant-")) {
				return "Anthropic API keys start with 'sk-ant-'"
			}
			break
		case "openai":
			if (!trimmed.startsWith("sk-")) {
				return "OpenAI API keys start with 'sk-'"
			}
			break
		case "perplexity":
			if (!trimmed.startsWith("pplx-")) {
				return "Perplexity API keys start with 'pplx-'"
			}
			break
		// Google, Groq, xAI, Mistral keys have no standard prefix -- accept anything non-empty
	}

	return undefined
}

/**
 * Validate a URL string.
 * Returns an error message if invalid, undefined if valid.
 */
export const validateUrl = (url: string): string | undefined => {
	try {
		const parsed = new URL(url.trim())
		if (!parsed.protocol.startsWith("http")) {
			return "URL must start with http:// or https://"
		}
		return undefined
	} catch {
		return "Invalid URL format"
	}
}

/**
 * Validate a positive integer string.
 * Returns an error message if invalid, undefined if valid.
 */
export const validatePositiveInt = (value: string): string | undefined => {
	const num = Number.parseInt(value.trim(), 10)
	if (Number.isNaN(num) || num <= 0) {
		return "Must be a positive integer"
	}
	return undefined
}
