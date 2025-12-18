//models (interfaces/types, not llms...)

export interface ModelInfo {
	id: string,
	object: string,
	type: string,
	state: string,
	max_context_length: number
}

export interface ChatMessage {
	role: string;
	parts: string[]
}
