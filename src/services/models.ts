//models (interfaces/types, not llms...)

export interface ModelInfo {
	id: String, 
	object: String,
	type: String,
	state: String,
	max_context_length: number
}
