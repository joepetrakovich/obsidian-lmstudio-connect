//models (interfaces/types, not llms...)

import * as z from "zod";
import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "ai";
import { createCurrentNotesPrompt, createUserPrompt } from "src/llm/prompts";
import { getOpenFiles } from "src/services/obsidian-utils";
import type LMStudioConnectPlugin from "src/main";

export interface ModelInfo {
	id: string,
	object: string,
	type: string,
	state: string,
	max_context_length: number
}

export type ServerConnection = {
	name: string;
	url: string;
	apiKey: string;
	status: "pending" | "ok" | "error";
	isDefault: boolean;
};
export interface Replacement {
	from: number;
	to: number;
	value: string;
}
export interface InputValue { text: string, markdownFiles?: string[], display: string }

export type ChatMessage =
	| { type: "text", content: string }
	| { type: "reasoning", content: string, status: "in-progress" | "done" }
	| { type: "tool_call", name: string, input?: Record<string, unknown>, output?: string, reason?: string }
	| { type: "stream_error", message: string };

export function toCompletionsApiMessages(plugin: LMStudioConnectPlugin, exchanges: Exchange[]): ModelMessage[] {
	const modelMessages: ModelMessage[] = [];
	const currentNotes: string[] = getOpenFiles(plugin).map(f => f.path);

	for (let i = 0; i < exchanges.length; i++) {
		const { userMessage, ai_sdk_messages } = exchanges[i];
		const query = createUserPrompt(userMessage.content);

		const text = i === 0
		? [createCurrentNotesPrompt(currentNotes), query].join('\n\n')
		: query 

		modelMessages.push({
			role: "user",
			content: [{ type: "text", text }],
		});

		(ai_sdk_messages ?? []).forEach((m) => modelMessages.push(m));
	}

	return modelMessages;
}

export interface Exchange {
	created: number;
	userMessage: { content: string, displayHTML: string };
	response: {
		status: "in-progress" | "completed" | "error";
		messages: ChatMessage[];
	}
	ai_sdk_messages?: (AssistantModelMessage | ToolModelMessage)[];
	response_id?: string;
}

export const Config = z.object({
	prompt: z.string(),
	hideToolUse: z.boolean().default(false),
	hideReasoning: z.boolean().default(false)
});

export type Config = z.infer<typeof Config>;
