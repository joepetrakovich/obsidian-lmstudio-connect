//models (interfaces/types, not llms...)

import * as z from "zod";
import type { AssistantModelMessage, ModelMessage, ToolModelMessage } from "ai";
import type { ReadFileInput } from "src/llm/tools/readFile";
import type { ListFilesInput } from "src/llm/tools/listFiles";
import type { WebFetchInput } from "src/llm/tools/webFetch";
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
	status: "pending" | "ok" | "error";
	isDefault: boolean;
};
export interface Replacement {
	from: number;
	to: number;
	value: string;
}
export interface InputValue { text: string, markdownFiles?: string[], display: string }

export interface ToolInputs {
	readFile: ReadFileInput;
	listFiles: ListFilesInput;
	webFetch: WebFetchInput;
}
export type ToolCallMessage = {
	[K in keyof ToolInputs]: {
		type: "tool-call";
		id: string;
		name: K;
		input: ToolInputs[K];
	}
}[keyof ToolInputs];

export type ResponseMessage = { type: "text", parts: string[], isFinal: boolean }
	| { type: "reasoning", parts: string[] }
	| ToolCallMessage
	| { type: "tool-result", id: string, content: string };

export const orderOf = (type: string) => {
	if (type === 'text') return 1;
	return 0;
};

export function toApiMessages(plugin: LMStudioConnectPlugin, exchanges: Exchange[]): ModelMessage[] {
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

		ai_sdk_messages.forEach((m) => modelMessages.push(m));
	}

	return modelMessages;
}

export interface Exchange {
	created: number;
	userMessage: { content: string, displayHTML: string };
	response: {
		status: "in-progress" | "completed" | "error";
		messages: ResponseMessage[];
	}
	ai_sdk_messages: (AssistantModelMessage | ToolModelMessage)[];
}

export const Config = z.object({
	prompt: z.string(),
	hideToolUse: z.boolean().default(false)
});

export type Config = z.infer<typeof Config>;
