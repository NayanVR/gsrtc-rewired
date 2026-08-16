import * as v from "valibot";
import { base } from "#/api/contract/base";
import { ContentPage, Faq } from "#/api/schemas";

export const content = {
	faqs: base
		.route({ method: "GET", path: "/content/faqs", summary: "FAQ list" })
		.output(v.object({ faqs: v.array(Faq) })),
	page: base
		.route({
			method: "GET",
			path: "/content/pages/{slug}",
			summary: "Page content",
		})
		.input(v.object({ slug: v.string() }))
		.output(v.nullable(ContentPage)),
};
