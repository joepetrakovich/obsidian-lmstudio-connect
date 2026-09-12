import type LMStudioConnectPlugin from "src/main";
import { type Exchange, type InputValue } from "./models";
import { aiSdkTransport, lmsTransport } from "./transports";

export class ChatSession {
	exchanges = $state<Exchange[]>([]);
	current = $state<Exchange>();
	abortController = $state<AbortController>();
	errored = false;
	private lastInput: InputValue | undefined;

	constructor(
		private plugin: LMStudioConnectPlugin,
		private restoreInput?: (text: string) => void,
	) {}

	get onabort() {
		const controller = this.abortController;
		return controller ? () => controller.abort() : undefined;
	}

	async send(message?: InputValue) {
		const input = message ?? this.lastInput;
		if (!input) return;
		this.lastInput = input;

		if (this.errored) this.plugin.modelStore.refreshAvailableModels();
		this.errored = false;

		this.exchanges.push({
			created: Date.now(),
			userMessage: {
				content: input.text,
				displayHTML: input.display,
			},
			response: {
				status: "in-progress",
				messages: [],
			},
			ai_sdk_messages: [],
		});
		const exchange = this.exchanges[this.exchanges.length - 1];
		this.current = exchange;

		this.abortController = new AbortController();
		const transport = this.plugin.settings.useVaultTools ? aiSdkTransport : lmsTransport;

		await transport.send({
			plugin: this.plugin,
			exchanges: this.exchanges,
			exchange,
			input,
			signal: this.abortController.signal,
			onError: () => {
				this.errored = true;
				this.plugin.modelStore.refreshAvailableModels();
			},
			restoreInput: this.restoreInput,
		});

		this.abortController = undefined;
		exchange.response.status = this.errored ? "error" : "completed";
	}

	clear() {
		this.exchanges = [];
		this.current = undefined;
	}

	async resend() {
		this.exchanges = this.exchanges.slice(0, -1);
		await this.send();
	}
}
