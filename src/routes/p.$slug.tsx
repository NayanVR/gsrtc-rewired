import { createFileRoute } from "@tanstack/react-router";
import { ActionForm } from "#/components/action-form";
import { PageBody } from "#/components/page-body";
import { PageShell } from "#/components/page-shell";
import { WalletPanel } from "#/components/wallet-panel";
import { PAGE_CONTENT } from "#/data/page-content";
import { PAGE_FORMS } from "#/data/page-forms";
import { PAGE_BLURBS, PAGE_TITLES } from "#/data/site-nav";

export const Route = createFileRoute("/p/$slug")({ component: StubPage });

const WALLET_VARIANTS: Record<string, "account" | "passbook"> = {
	"wallet-account": "account",
	"wallet-passbook": "passbook",
};

function StubPage() {
	const { slug } = Route.useParams();
	const title = PAGE_TITLES[slug];

	if (!title) {
		return <PageShell title="Page not found" />;
	}

	const wallet = WALLET_VARIANTS[slug];
	const form = PAGE_FORMS[slug];
	const content = PAGE_CONTENT[slug];
	const blurb = form?.intro ?? content?.intro ?? PAGE_BLURBS[slug];

	return (
		<PageShell blurb={blurb} title={title}>
			{renderBody({ wallet, form, content })}
		</PageShell>
	);
}

function renderBody({
	wallet,
	form,
	content,
}: {
	wallet?: "account" | "passbook";
	form?: (typeof PAGE_FORMS)[string];
	content?: (typeof PAGE_CONTENT)[string];
}) {
	if (wallet) {
		return <WalletPanel variant={wallet} />;
	}
	if (form) {
		return <ActionForm form={form} />;
	}
	if (content?.sections?.length || content?.contact) {
		return <PageBody content={content} />;
	}
	return null;
}
