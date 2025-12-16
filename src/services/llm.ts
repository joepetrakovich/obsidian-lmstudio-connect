import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { type RequestUrlParam, type RequestUrlResponse, requestUrl } from "obsidian";
import type { ModelInfo } from "./models";

function toObsidianRequestParams(url: RequestInfo | URL, init?: RequestInit): RequestUrlParam {
	const fetchReq = (typeof url === 'string' || url instanceof String) ? null : (url as Request);
	const urlString = fetchReq === null ? (url as string) : fetchReq.url;
	const obsidianReq: RequestUrlParam = {
		url: urlString,
	};

	if (fetchReq?.body) {
		// @ts-ignore
		obsidianReq.body = fetchReq.body;
	} else if (init?.body) {
		// @ts-ignore
		obsidianReq.body = init.body;
	}

	if (fetchReq?.headers) {
		// @ts-ignore
		obsidianReq.headers = { ...fetchReq.headers };
	} else if (init?.headers) {
		// @ts-ignore
		obsidianReq.headers = { ...init.headers };
	}
	if (obsidianReq.headers) {
		// SimpleURLLoaderWrapper will throw ERR_INVALID_ARGUMENT if you try to pass this
		delete obsidianReq.headers['content-length'];
	}

	if (fetchReq?.method) {
		obsidianReq.method = fetchReq.method;
	} else if (init?.method) {
		obsidianReq.method = init.method;
	}

	return obsidianReq;
}

const customFetch = async (input: string, init?: RequestInit): Promise<Response> => {
	console.log("Intercepting request to URL:", input);
	console.log("Request options:", JSON.stringify(init, null, 2));

	const response: RequestUrlResponse = await requestUrl(toObsidianRequestParams(input, init));
	const fetchResp = new Response(
		response.arrayBuffer,
		{
			status: response.status,
			headers: response.headers,
		});
	return fetchResp;
};

const baseURL = "http://localhost:1234/v1";
export const lmstudio = createOpenAICompatible({
	name: "lmstudio",
	baseURL,
	fetch: customFetch,
});

export const listModels = async (): Promise<ModelInfo[]> => {
	const response: RequestUrlResponse = await requestUrl(`${baseURL}/models`);
	const { data } = response.json as { data: ModelInfo[] };
	console.log("/models: ", data);
	return data
}


