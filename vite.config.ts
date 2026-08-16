import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	plugins: [
		devtools(),
		// Don't mark @sentry/* as rollup-external: that stops Nitro tracing it
		// into .output/server/node_modules, so the SSR function 500s on Vercel
		// with ERR_MODULE_NOT_FOUND. Let Nitro bundle/trace it normally.
		nitro(),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	resolve: { tsconfigPaths: true },
});

export default config;
