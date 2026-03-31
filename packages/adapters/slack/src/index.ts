import { type AllMiddlewareArgs, App, type SlackEventMiddlewareArgs } from "@slack/bolt"

// ─── Inlined types (originally from @openzosma/gateway) ──────────────────────
// These are duplicated here to avoid a circular workspace dependency:
// adapter-slack → gateway → adapter-slack.

interface ChannelAdapter {
	readonly name: string
	init(sessionManager: SlackSessionManager): Promise<void>
	shutdown(): Promise<void>
}

interface SlackSessionManager {
	createSession(userId?: string, agentConfigId?: string): Promise<{ id: string }>
	sendMessage(sessionId: string, content: string, signal?: AbortSignal): AsyncIterable<SlackGatewayEvent>
}

interface SlackGatewayEvent {
	type: string
	text?: string
	error?: string
}

// ─────────────────────────────────────────────────────────────────────────────

export interface SlackAdapterConfig {
	botToken: string
	appToken?: string
}

type MessageEvent = SlackEventMiddlewareArgs<"message"> & AllMiddlewareArgs

/**
 * Slack channel adapter using Bolt's Socket Mode.
 *
 * Maps Slack threads (channel + thread_ts) to orchestrator sessions and
 * streams agent responses back as threaded replies.
 */
export class SlackAdapter implements ChannelAdapter {
	readonly name = "slack"
	private app: App
	private sessionManager: SlackSessionManager | undefined
	private sessionMap = new Map<string, string>()

	constructor(config: SlackAdapterConfig) {
		this.app = new App({
			token: config.botToken,
			appToken: config.appToken,
			socketMode: Boolean(config.appToken),
		})
	}

	async init(sessionManager: SlackSessionManager): Promise<void> {
		this.sessionManager = sessionManager
		this.app.message(this.handleMessage.bind(this))
		await this.app.start()
	}

	async shutdown(): Promise<void> {
		await this.app.stop()
	}

	private threadKey(channel: string, threadTs: string): string {
		return `slack:${channel}:${threadTs}`
	}

	private async getOrCreateSession(channel: string, threadTs: string): Promise<string> {
		const key = this.threadKey(channel, threadTs)
		const existing = this.sessionMap.get(key)
		if (existing) return existing

		const session = await this.sessionManager!.createSession()
		this.sessionMap.set(key, session.id)
		return session.id
	}

	private async handleMessage({ message, say }: MessageEvent): Promise<void> {
		if (!this.sessionManager) return
		if (!("text" in message) || !message.text) return
		if ("bot_id" in message) return

		const channel = message.channel
		const threadTs = ("thread_ts" in message ? message.thread_ts : message.ts) ?? message.ts
		const userText = message.text

		const sessionId = await this.getOrCreateSession(channel, threadTs)

		const controller = new AbortController()
		const events = this.sessionManager.sendMessage(sessionId, userText, controller.signal)

		let fullResponse = ""

		for await (const event of events) {
			if (event.type === "message_update" && event.text) {
				fullResponse += event.text
			}
			if (event.type === "error") {
				await say({ text: `Error: ${event.error ?? "unknown error"}`, thread_ts: threadTs })
				return
			}
		}

		if (fullResponse) {
			await say({ text: fullResponse, thread_ts: threadTs })
		}
	}
}

