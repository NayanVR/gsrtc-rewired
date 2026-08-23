import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
	Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

	return {
		test: {
			environment: "node",
			// Integration tests share the Supabase Postgres instance. Its network
			// latency can exceed Vitest's 5-second unit-test default under parallel
			// load, while each test still performs a bounded set of queries.
			testTimeout: 15_000,
		},
	};
});
