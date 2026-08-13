import { BusIcon } from "#/components/icons";

const FOOTER_COLUMNS = [
	{
		heading: "Book & travel",
		links: [
			"Advance booking",
			"Bus pass",
			"Statue of Unity",
			"Electric bus",
			"Special services",
		],
	},
	{
		heading: "Manage",
		links: [
			"Cancel ticket",
			"Refund status",
			"Boarding points",
			"Bus enquiry",
			"Live tracking",
		],
	},
	{
		heading: "Corporation",
		links: ["About us", "Leadership", "Tenders", "Recruitment", "Achievements"],
	},
	{
		heading: "Policies",
		links: [
			"Booking policy",
			"Privacy policy",
			"RTI disclosure",
			"Citizen's rights",
			"Grievance redressal",
		],
	},
] as const;

export function SiteFooter() {
	return (
		<footer className="mt-16 bg-ink-900 text-ink-300">
			<div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-5">
				<div className="lg:col-span-1">
					<div className="flex items-center gap-2.5 text-white">
						<span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600">
							<BusIcon height={22} width={22} />
						</span>
						<span className="font-bold text-lg">GSRTC</span>
					</div>
					<p className="mt-4 text-ink-400 text-sm leading-relaxed">
						Gujarat State Road Transport Corporation. Steering miles with smiles
						since 1960.
					</p>
					<p className="mt-4 font-semibold text-sm text-white">
						Toll free · 1800 233 666666
					</p>
				</div>

				{FOOTER_COLUMNS.map((column) => (
					<nav key={column.heading}>
						<h2 className="font-semibold text-sm text-white">
							{column.heading}
						</h2>
						<ul className="mt-4 space-y-2.5">
							{column.links.map((link) => (
								<li key={link}>
									<a
										className="text-ink-400 text-sm transition-colors hover:text-white"
										href="/"
									>
										{link}
									</a>
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>

			<div className="border-ink-800 border-t">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-5 text-ink-500 text-xs sm:flex-row">
					<p>© {new Date().getFullYear()} GSRTC. All rights reserved.</p>
					<p>A redesign concept · not the official website</p>
				</div>
			</div>
		</footer>
	);
}
