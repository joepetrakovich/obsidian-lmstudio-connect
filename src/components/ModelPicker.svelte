<script lang='ts'>
	import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
	import { generateText } from "ai";
	import { type RequestUrlParam, type RequestUrlResponse, requestUrl } from "obsidian";

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
          obsidianReq.headers = {...fetchReq.headers};
        } else if (init?.headers) {
          // @ts-ignore
          obsidianReq.headers = {...init.headers};
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

	const lmstudio = createOpenAICompatible({
		name: "lmstudio",
		baseURL: "http://localhost:1234/v1",
		fetch: customFetch,
	});

	const test = generateText({
		model: lmstudio("openai/gpt-oss-20b"),
		prompt: "Why is the sky blue?",
	});

	
</script>

{#await test}
	<!-- promise is pending -->
	<p>waiting for the promise to resolve...</p>
{:then value}
	<!-- promise was fulfilled or not a Promise -->
	<p>The value is {value}</p>
{:catch error}
	<!-- promise was rejected -->
	<p>Something went wrong: {error.message}</p>
{/await}
