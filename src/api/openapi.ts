import { OpenAPIGenerator } from "@orpc/openapi";
import { experimental_ValibotToJsonSchemaConverter } from "@orpc/valibot";
import { appContract } from "#/api/contract";

const openApiGenerator = new OpenAPIGenerator({
	schemaConverters: [new experimental_ValibotToJsonSchemaConverter()],
});

export function generateOpenApiSpec() {
	return openApiGenerator.generate(appContract, {
		info: {
			title: "GSRTC Rewired API",
			version: "0.1.0",
		},
	});
}
