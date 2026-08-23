import { createFileRoute } from "@tanstack/react-router";
import { getContentPage } from "#/api/fns";
import type { PageForm } from "#/api/schemas";
import { ActionForm } from "#/components/action-form";
import { PageBody } from "#/components/page-body";
import { PageShell } from "#/components/page-shell";
import { WalletPanel } from "#/components/wallet-panel";
import { EXTERNAL_LINKS, PAGE_CONTENT } from "#/data/page-content";
import { PAGE_BLURBS, PAGE_TITLES } from "#/data/site-nav";

export const Route = createFileRoute("/p/$slug")({
	loader: ({ params }) => getContentPage({ data: { slug: params.slug } }),
	component: StubPage,
});

const WALLET_VARIANTS: Record<string, "account" | "passbook"> = {
	"wallet-account": "account",
	"wallet-passbook": "passbook",
};

function StubPage() {
	const { slug } = Route.useParams();
	const title = PAGE_TITLES[slug];
	const page = Route.useLoaderData();

	if (!title) {
		return <PageShell title="Page not found" />;
	}

	const wallet = WALLET_VARIANTS[slug];
	const form = page?.form;
	const content = PAGE_CONTENT[slug];
	const blurb = form?.intro ?? content?.intro ?? PAGE_BLURBS[slug];

	return (
		<PageShell blurb={blurb} title={title}>
			{renderBody({ content, form, slug, wallet })}
		</PageShell>
	);
}

function renderBody({
	wallet,
	form,
	content,
	slug,
}: {
	wallet?: "account" | "passbook";
	form?: PageForm;
	content?: (typeof PAGE_CONTENT)[string];
	slug: string;
}) {
	if (wallet) {
		return <WalletPanel variant={wallet} />;
	}
	if (form) {
		return (
			<ActionForm external={EXTERNAL_LINKS[slug]} form={form} formId={slug} />
		);
	}
	if (content?.sections?.length || content?.contact) {
		return <PageBody content={content} />;
	}
	return null;
}
