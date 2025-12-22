//models (interfaces/types, not llms...)

export interface ModelInfo {
	id: string,
	object: string,
	type: string,
	state: string,
	max_context_length: number
}

export enum Role { AI = "ai", User = "user" }
export enum Status { Pending = "pending", Streaming = "streaming", Complete = "complete" }

export interface ChatMessage {
	status: Status; 
	role: Role;
	parts: string[]
}
