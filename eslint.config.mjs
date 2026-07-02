// eslint.config.mjs
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{
		ignores: [
			"main.js",
			"main.css",
			"*.config.mjs",
			"version-bump.mjs",
			"node_modules/**",
			"dist/**",
			"src/**/*.svelte",
		],
	},
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts", "**/*.mts"],
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
			rules: {
				"@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
				"@typescript-eslint/ban-ts-comment": "off",
				"@typescript-eslint/no-empty-function": "off",
				"no-prototype-builtins": "off",
				"import/no-extraneous-dependencies": "off",
			},
	},
	{
		files: ["**/*.svelte.ts"],
		languageOptions: {
			globals: {
				$state: "readonly",
				$derived: "readonly",
				$effect: "readonly",
				$props: "readonly",
				$bindable: "readonly",
				$inspect: "readonly",
				$host: "readonly",
			},
		},
	},
	{
		files: ["package.json"],
		rules: {
			"depend/ban-dependencies": "off",
		},
	},
]);
