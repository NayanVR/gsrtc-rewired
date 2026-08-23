import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateOpenApiSpec } from "#/api/openapi";

const outputPath = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../docs/openapi.json"
);
const spec = await generateOpenApiSpec();

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(spec, null, 2)}\n`);
