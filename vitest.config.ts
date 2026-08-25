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
			// Network latency can exceed Vitest's 5-second default while each test
			// still performs a bounded set of database queries.
			testTimeout: 15_000,
		},
	};
});
