import { MailIcon, PhoneIcon, PinIcon } from "#/components/icons";
import type { PageContent } from "#/data/page-content";

// Renders scraped page content: sections, bullets and an optional contact card.
export function PageBody({ content }: { content?: PageContent }) {
	const sections = content?.sections ?? [];

	return (
		<div className="max-w-3xl space-y-8">
			{sections.map((section, i) => (
				<section key={section.heading ?? i}>
					{section.heading ? (
						<h2 className="mb-2 font-bold font-display text-ink-900 text-xl">
							{section.heading}
						</h2>
					) : null}
					{section.paragraphs?.map((text) => (
						<p className="mt-2 text-ink-600 leading-relaxed" key={text}>
							{text}
						</p>
					))}
					{section.bullets?.length ? (
						<ul className="mt-3 space-y-1.5">
							{section.bullets.map((item) => (
								<li
									className="flex gap-2 text-ink-600 leading-relaxed"
									key={item}
								>
									<span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron-400" />
									{item}
								</li>
							))}
						</ul>
					) : null}
				</section>
			))}

			{content?.contact ? <ContactCard contact={content.contact} /> : null}
		</div>
	);
}

function ContactCard({
	contact,
}: {
	contact: NonNullable<PageContent["contact"]>;
}) {
	return (
		<div className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-card">
			<dl className="space-y-3 text-sm">
				{contact.address ? (
					<div className="flex gap-2.5 text-ink-700">
						<PinIcon className="mt-0.5 shrink-0 text-saffron-500" />
						<dd>{contact.address}</dd>
					</div>
				) : null}
				{contact.phone ? (
					<div className="flex gap-2.5 text-ink-700">
						<PhoneIcon className="mt-0.5 shrink-0 text-saffron-500" />
						<dd>{contact.phone}</dd>
					</div>
				) : null}
				{contact.email ? (
					<div className="flex gap-2.5 text-ink-700">
						<MailIcon className="mt-0.5 shrink-0 text-saffron-500" />
						<dd>{contact.email}</dd>
					</div>
				) : null}
			</dl>
		</div>
	);
}
