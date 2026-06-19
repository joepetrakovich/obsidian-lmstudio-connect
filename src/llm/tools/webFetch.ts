import { tool } from "ai";
import { htmlToMarkdown } from "obsidian";
import { requestUrl } from "obsidian";
import { extractTextFromHTML } from "src/services/htmltextextractor";
import z from "zod";

//NOTE: this is the webFetch tool from opencode, just refitted for Obsidian.

const DESCRIPTION = `- Fetches content from a specified URL
- Takes a URL and optional format as input
- Fetches the URL content, converts to requested format (markdown by default)
- Returns the content in the specified format
- Use this tool when you need to retrieve and analyze web content

Usage notes:
  - The URL must be a fully-formed valid URL
  - HTTP URLs will be automatically upgraded to HTTPS
  - Format options: "markdown" (default), "text", or "html"
  - This tool is read-only and does not modify any files
  - Results may be truncated large`;

const webFetchSchema = z.object({
	url: z.string().describe("The URL to fetch content from"),
	format: z
		.enum(["text", "markdown", "html"])
		.default("markdown")
		.describe("The format to return the content in (text, markdown, or html). Defaults to markdown."),
	timeout: z.number().describe("Optional timeout in seconds (max 120)").optional(),
});
export type WebFetchInput = z.infer<typeof webFetchSchema>;

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_TIMEOUT = 30 * 1000 // 30 seconds
const MAX_TIMEOUT = 120 * 1000 // 2 minutes

export const createWebFetchTool = () => {
	return tool({
		description: DESCRIPTION,
		inputSchema:  webFetchSchema ,
		execute: async (params: WebFetchInput) => {
			// Validate URL
			if (!params.url.startsWith("http://") && !params.url.startsWith("https://")) {
				throw new Error("URL must start with http:// or https://")
			}
			const timeout = Math.min((params.timeout ?? DEFAULT_TIMEOUT / 1000) * 1000, MAX_TIMEOUT)

			const controller = new AbortController()
			const timeoutId = window.setTimeout(() => controller.abort(), timeout)

			// Build Accept header based on requested format with q parameters for fallbacks
			let acceptHeader = "*/*"
			switch (params.format) {
				case "markdown":
					acceptHeader = "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1"
					break
				case "text":
					acceptHeader = "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1"
					break
				case "html":
					acceptHeader = "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1"
					break
				default:
					acceptHeader =
						"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
			}

			const response = await requestUrl({
				url: params.url,
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
					Accept: acceptHeader,
					"Accept-Language": "en-US,en;q=0.9",
				}
			});

			window.clearTimeout(timeoutId)

			if (response.status >= 400) {
				throw new Error(`Request failed with status code: ${response.status}`)
			}

			// Check content length
			const contentLength = response.headers["content-length"];
			if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
				throw new Error("Response too large (exceeds 5MB limit)")
			}

			const arrayBuffer =  response.arrayBuffer;
			if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
				throw new Error("Response too large (exceeds 5MB limit)")
			}

			const content = new TextDecoder().decode(arrayBuffer)
			const contentType = response.headers["content-type"] || ""

			const title = `${params.url} (${contentType})`

			// Handle content based on requested format and actual content type
			switch (params.format) {
				case "markdown":
					if (contentType.includes("text/html")) {
						const markdown = htmlToMarkdown(content)
						return {
							output: markdown,
							title,
							metadata: {},
						}
					}
					return {
						output: content,
						title,
						metadata: {},
					}

				case "text":
					if (contentType.includes("text/html")) {
						const text = extractTextFromHTML(content)
						return {
							output: text,
							title,
							metadata: {},
						}
					}
					return {
						output: content,
						title,
						metadata: {},
					}

				case "html":
					return {
						output: content,
						title,
						metadata: {},
					}

				default:
					return {
						output: content,
						title,
						metadata: {},
					}
			}
		},
	})
}
