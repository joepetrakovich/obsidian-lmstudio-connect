import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, stepCountIs } from "ai";
import type LMStudioConnectPlugin from "src/main";
import {
	toCompletionsApiMessages,
	type ChatMessage,
	type Exchange,
	type InputValue,
} from "./models";
import { createReadFileTool } from "src/llm/tools/readFile";
import { createListFilesTool } from "src/llm/tools/listFiles";
import { createWebFetchTool } from "src/llm/tools/webFetch";
import { systemPrompt } from "src/llm/prompts";
import { streamChat, type ChatRequest } from "./lms-api";

export interface SendArgs {
	plugin: LMStudioConnectPlugin;
	exchanges: Exchange[];
	exchange: Exchange;
	input: InputValue;
	signal: AbortSignal;
	onError: () => void;
	restoreInput?: (text: string) => void;
}

export interface ChatTransport {
	send(args: SendArgs): Promise<void>;
}

const lastMessage = (exchange: Exchange): ChatMessage | undefined =>
	exchange.response.messages[exchange.response.messages.length - 1];

export const aiSdkTransport: ChatTransport = {
	async send({ plugin, exchanges, exchange, signal, onError }) {
		const modelStore = plugin.modelStore;
		const useWebFetchTool = plugin.settings.useWebFetchTool;
		const provider = createOpenAICompatible({
			name: "lmstudio",
			baseURL: modelStore.currentBaseUrl,
			apiKey: modelStore.currentApiKey,
		});

		const tools = {
			readFile: createReadFileTool(plugin),
			listFiles: createListFilesTool(plugin),
		};
		if (useWebFetchTool) Object.assign(tools, { webFetch: createWebFetchTool() });

		const result = streamText({
			model: provider(modelStore.currentModel),
			system: systemPrompt(useWebFetchTool),
			messages: toCompletionsApiMessages(plugin, exchanges),
			tools,
			stopWhen: stepCountIs(20),
			onFinish({ response }) {
				exchange.ai_sdk_messages = response.messages;
			},
			abortSignal: signal,
			onError({ error }) {
				console.error(error);
				onError();
			},
		});

		let currentText: ChatMessage | undefined;
		let currentReasoning: ChatMessage | undefined;

		for await (const part of result.fullStream) {
			switch (part.type) {
				case "start-step":
					currentText = undefined;
					currentReasoning = undefined;
					break;
				case "reasoning-start":
					exchange.response.messages.push({
						type: "reasoning",
						content: "",
						status: "in-progress",
					});
					currentReasoning = lastMessage(exchange);
					break;
				case "reasoning-delta":
					if (currentReasoning?.type === "reasoning") {
						currentReasoning.content += part.text;
					}
					break;
				case "reasoning-end":
					if (currentReasoning?.type === "reasoning") {
						currentReasoning.status = "done";
					}
					currentReasoning = undefined;
					break;
				case "text-start":
					exchange.response.messages.push({ type: "text", content: "" });
					currentText = lastMessage(exchange);
					break;
				case "text-delta":
					if (currentText?.type === "text") {
						currentText.content += part.text;
					}
					break;
				case "text-end": {
					const messages = exchange.response.messages;
					if (
						currentText?.type === "text" &&
						!currentText.content.trim()
					) {
						messages.pop();
					}
					currentText = undefined;
					break;
				}
				case "tool-call":
					exchange.response.messages.push({
						type: "tool_call",
						name: part.toolName,
						input: part.input as Record<string, unknown>,
					});
					break;
				case "error":
					console.error(part.error);
					onError();
					break;
			}
		}
	},
};

export const lmsTransport: ChatTransport = {
	async send({ plugin, exchanges, exchange, input, signal, onError, restoreInput }) {
		const modelStore = plugin.modelStore;
		const previousResponseId = exchanges[exchanges.length - 2]?.response_id;
		let currentOutputItem: ChatMessage | undefined;

		const request: ChatRequest = {
			model: modelStore.currentModel,
			input: [{ type: "text", content: input.text }],
			previous_response_id: previousResponseId,
			stream: true,
			integrations: modelStore.currentIntegrations,
		};

		try {
			for await (const event of streamChat(
				`${modelStore.currentServer?.url}/api/v1/chat`,
				request,
				{
					apiKey: modelStore.currentApiKey,
					signal,
				},
			)) {
				switch (event.type) {
					case "reasoning.start":
						exchange.response.messages.push({
							type: "reasoning",
							content: "",
							status: "in-progress",
						});
						currentOutputItem = lastMessage(exchange);
						break;
					case "reasoning.delta":
						if (currentOutputItem?.type === "reasoning") {
							currentOutputItem.content += event.content;
						}
						break;
					case "reasoning.end":
						if (currentOutputItem?.type === "reasoning") {
							currentOutputItem.status = "done";
						}
						currentOutputItem = undefined;
						break;
					case "message.start":
						exchange.response.messages.push({
							type: "text",
							content: "",
						});
						currentOutputItem = lastMessage(exchange);
						break;
					case "message.delta":
						if (currentOutputItem?.type === "text") {
							currentOutputItem.content += event.content;
						}
						break;
					case "message.end": {
						const messages = exchange.response.messages;
						if (
							currentOutputItem?.type === "text" &&
							!currentOutputItem.content.trim()
						) {
							messages.pop();
						}
						currentOutputItem = undefined;
						break;
					}
					case "error":
						exchange.response.messages.push({
							type: "stream_error",
							message: event.error.message,
						});
						restoreInput?.(input.text);
						break;
					case "tool_call.start":
						exchange.response.messages.push({
							type: "tool_call",
							name: event.tool,
							input: {},
							output: "",
						});
						currentOutputItem = lastMessage(exchange);
						break;
					case "tool_call.name":
						if (currentOutputItem?.type === "tool_call") {
							currentOutputItem.name = event.tool_name;
						}
						break;
					case "tool_call.arguments":
						if (currentOutputItem?.type === "tool_call") {
							currentOutputItem.input = {
								...currentOutputItem.input,
								...event.arguments,
							};
						}
						break;
					case "tool_call.success":
						if (currentOutputItem?.type === "tool_call") {
							currentOutputItem.input = event.arguments;
							currentOutputItem.output = event.output;
						}
						currentOutputItem = undefined;
						break;
					case "tool_call.failure": {
						const messages = exchange.response.messages;
						if (currentOutputItem?.type === "tool_call") {
							messages.pop();
						}
						messages.push({
							type: "tool_call",
							name: event.metadata.tool_name,
							input: event.metadata.arguments,
							reason: event.reason,
						});
						currentOutputItem = undefined;
						break;
					}
					case "chat.end":
						exchange.response_id = event.result.response_id;
						break;
				}
			}
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				console.error(e);
				onError();
			}
			restoreInput?.(input.text);
		}
	},
};
