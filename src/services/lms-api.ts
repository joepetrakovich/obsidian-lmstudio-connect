export interface ChatRequest {
	model: string,
	input: string | (TextInput | ImageInput)[],
	system_prompt?: string,
	integrations?: Integration[],
	stream?: boolean,
	temperature?: number,
	top_p?: number,
	top_k?: number,
	min_p?: number,
	repeat_penalty?: number,
	max_output_tokens?: number,
	reasoning?: "off" | "low" | "medium" | "high" | "on",
	context_length?: number,
	store?: boolean,
	previous_response_id?: string
}

export interface TextInput {
	type: "text"
	content: string
}

export interface ImageInput {
	type: "image",
	data_url: string
}

export type Integration = string | PluginIntegration | EphemeralMcpIntegration

export interface PluginIntegration {
	type: "plugin",
	id: string,
	allowed_tools?: string[]
}

export interface EphemeralMcpIntegration {
	type: "ephemeral_mcp",
	server_label: string,
	server_url: string,
	allowed_tools?: string[],
	headers?: Record<string, string>
}

export interface ChatResponse {
	model_instance_id: string,
	output: OutputItem[],
	stats: ResponseStats,
	response_id?: string
}

export type OutputItem = OutputMessage | ToolCallOutput | ReasoningOutput | InvalidToolCallOutput

export interface OutputMessage {
	type: "message",
	content: string
}

export interface ToolCallOutput {
	type: "tool_call",
	tool: string,
	arguments: Record<string, unknown>,
	output: string,
	provider_info: ProviderInfo
}

export interface ReasoningOutput {
	type: "reasoning",
	content: string
}

export interface InvalidToolCallOutput {
	type: "invalid_tool_call",
	reason: string,
	metadata: {
		type: "invalid_name" | "invalid_arguments",
		tool_name: string,
		arguments?: Record<string, unknown>,
		provider_info?: ProviderInfo
	}
}

export type ProviderInfo =
	{ type: "plugin", plugin_id?: string } |
	{ type: "ephemeral_mcp", server_label?: string }

export interface ResponseStats {
	input_tokens: number,
	total_output_tokens: number,
	reasoning_output_tokens: number,
	tokens_per_second: number,
	time_to_first_token_seconds: number,
	model_load_time_seconds?: number
}

export type StreamError = {
	type:
	| "invalid_request"
	| "unknown"
	| "mcp_connection_error"
	| "plugin_connection_error"
	| "not_implemented"
	| "model_not_found"
	| "job_not_found"
	| "internal_error",
	message: string,
	code?: string,
	param?: string
}

export type ChatStreamEvent =
	| { type: "chat.start", model_instance_id: string }
	| { type: "model_load.start", model_instance_id: string }
	| { type: "model_load.progress", model_instance_id: string, progress: number }
	| { type: "model_load.end", model_instance_id: string, load_time_seconds: number }
	| { type: "prompt_processing.start" }
	| { type: "prompt_processing.progress", progress: number }
	| { type: "prompt_processing.end" }
	| { type: "reasoning.start" }
	| { type: "reasoning.delta", content: string }
	| { type: "reasoning.end" }
	| { type: "tool_call.start", tool: string, provider_info: ProviderInfo }
	| { type: "tool_call.name", tool_name: string, provider_info: ProviderInfo }
	| { type: "tool_call.arguments", tool: string, arguments: Record<string, unknown>, provider_info: ProviderInfo }
	| { type: "tool_call.success", tool: string, arguments: Record<string, unknown>, output: string, provider_info: ProviderInfo }
	| { type: "tool_call.failure", reason: string, metadata: InvalidToolCallOutput["metadata"] }
	| { type: "message.start" }
	| { type: "message.delta", content: string }
	| { type: "message.end" }
	| { type: "error", error: StreamError }
	| { type: "chat.end", result: ChatResponse }

export async function* streamChat(
	url: string,
	request: ChatRequest,
	options: { apiKey?: string, signal?: AbortSignal } = {},
): AsyncGenerator<ChatStreamEvent> {
	// requestUrl buffers the full response and cannot consume SSE streams
	// eslint-disable-next-line no-restricted-globals
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
		},
		body: JSON.stringify(request),
		signal: options.signal,
	});

	if (!response.ok || !response.body) {
		throw new Error(`Chat stream failed: ${response.status}`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		let match: RegExpExecArray | null;
		const separator = /\r?\n\r?\n/;
		while ((match = separator.exec(buffer)) !== null) {
			const frame = buffer.slice(0, match.index);
			buffer = buffer.slice(match.index + match[0].length);

			const dataLines: string[] = [];
			for (const line of frame.split(/\r?\n/)) {
				if (line.startsWith("data:")) {
					dataLines.push(line.slice(5).trimStart());
				}
			}
			if (dataLines.length) {
				yield JSON.parse(dataLines.join("\n")) as ChatStreamEvent;
			}
		}
	}
}

