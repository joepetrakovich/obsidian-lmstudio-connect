//models (interfaces/types, not llms...)

export interface ModelInfo {
	id: string,
	object: string,
	type: string,
	state: string,
	max_context_length: number
}

export enum Role { Assistant = "assistant", User = "user" }
export enum Status { Pending = "pending", Streaming = "streaming", Complete = "complete" }

export interface ChatMessage {
	status: Status;
	role: Role;
	parts: string[]
}

export type ServerConnection = {
	name: string;
	url: string;
	status: "pending" | "ok" | "error";
	isDefault: boolean;
};
