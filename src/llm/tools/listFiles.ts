import { tool } from "ai";
import { TFolder } from "obsidian";
import type LMStudioConnectPlugin from "src/main";
import z from "zod";

const DESCRIPTION = `Lists the contents of a folder in the user's current Obsidian vault, returning the names and paths of its immediate children (files and subfolders).
Use this when the user references a folder and you need to discover what is inside it before reading files. Derive the folder path from the open note paths in the context or from the user's message.
Returns an array of objects, each with a \`path\` and a \`type\` ("file" or "folder"). Call readFile on the relevant file paths afterward.

Usage:
- If no folderPath is provided, the vault root is listed.
- It is okay to list a folder that does not exist; an error will be returned.`;

const listFilesSchema = z.object({
	folderPath: z
		.string()
		.default("/")
		.describe("The path to the folder to list. Defaults to the vault root (/) if omitted."),
});
export type ListFilesInput = z.infer<typeof listFilesSchema>;

export function createListFilesTool(plugin: LMStudioConnectPlugin) {
	return tool({
		description: DESCRIPTION,
		inputSchema: listFilesSchema,
		execute: async ({ folderPath }: { folderPath: string }) => {
			try {
				const path = !folderPath || folderPath === "/" ? "" : folderPath;
				const folder = path === ""
					? plugin.app.vault.getRoot()
					: plugin.app.vault.getAbstractFileByPath(path);

				if (!folder) {
					throw new Error(`Folder not found: ${folderPath}`);
				}
				if (!(folder instanceof TFolder)) {
					throw new Error(`Path is not a folder: ${folderPath}`);
				}

				const entries = folder.children
					.map((child) => ({
						path: child.path,
						type: child instanceof TFolder ? "folder" : "file",
					}))
					.sort((a, b) => {
						if (a.type !== b.type) {
							return a.type === "folder" ? -1 : 1;
						}
						return a.path.localeCompare(b.path);
					});

				return entries;
			} catch (error) {
				console.error("Error listing folder", error);
				throw error;
			}
		},
	});
}
