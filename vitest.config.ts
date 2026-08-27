import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
	Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

	return {
		test: {
			environment: "node",
			// Integration tests share one Postgres database and several suites clean
			// common trip fixtures. Running files concurrently makes those cleanups
			// race, so the suite deliberately serializes files.
			fileParallelism: false,
			// Integration tests use the configured Postgres service. Cold starts and
			// network latency can make a bounded database flow take over 30 seconds.
			hookTimeout: 120_000,
			testTimeout: 120_000,
		},
	};
});
