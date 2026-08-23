import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { appContract } from "#/api/contract";
import { generateOpenApiSpec } from "#/api/openapi";

const SPEC_PATH = fileURLToPath(
	new URL("../../docs/openapi.json", import.meta.url)
);

interface RouteOperation {
	method: "delete" | "get" | "head" | "options" | "patch" | "post" | "put";
	path: string;
}

function contractOperations(value: unknown): RouteOperation[] {
	if (!value || typeof value !== "object") {
		return [];
	}
	if ("~orpc" in value) {
		const definition = value["~orpc"];
		if (definition && typeof definition === "object" && "route" in definition) {
			const { route } = definition;
			if (
				route &&
				typeof route === "object" &&
				"method" in route &&
				"path" in route &&
				typeof route.method === "string" &&
				typeof route.path === "string"
			) {
				return [
					{
						method: route.method.toLowerCase() as RouteOperation["method"],
						path: route.path,
					},
				];
			}
		}
	}
	return Object.values(value).flatMap(contractOperations);
}

describe("OpenAPI specification", () => {
	it("is current with the API contract", async () => {
		const committedSpec = JSON.parse(readFileSync(SPEC_PATH, "utf8"));

		expect(committedSpec).toEqual(await generateOpenApiSpec());
	});

	it("documents every contract route and typed error response", async () => {
		const spec = await generateOpenApiSpec();
		const operations = contractOperations(appContract);

		expect(spec.openapi).toBe("3.1.1");
		expect(operations).toHaveLength(34);
		expect(Object.keys(appContract)).toHaveLength(10);
		for (const operation of operations) {
			expect(spec.paths?.[operation.path]?.[operation.method]).toBeDefined();
		}

		const walletTopUp = spec.paths?.["/wallet/topup"]?.post;
		expect(walletTopUp?.responses).toHaveProperty("401");
		expect(walletTopUp?.responses).toHaveProperty("409");
		expect(walletTopUp?.responses).toHaveProperty("500");
		expect(JSON.stringify(walletTopUp?.responses["500"])).toContain(
			"PAYMENT_FAILED"
		);
		const serializedSpec = JSON.stringify(spec);
		for (const errorCode of [
			"CONFLICT",
			"NOT_FOUND",
			"PAYMENT_FAILED",
			"RATE_LIMITED",
			"UNAUTHORIZED",
		]) {
			expect(serializedSpec).toContain(errorCode);
		}
	});
});
