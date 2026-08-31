import { Link } from "@tanstack/react-router";
import { BrandMark } from "#/components/brand-mark";
import { AndroidIcon, AppleIcon, PhoneIcon } from "#/components/icons";
import { FOOTER_COLUMNS, slugify } from "#/data/site-nav";
import { useTranslation } from "#/lib/i18n";

const BROWSERS = ["Chrome", "Edge", "Firefox", "Opera"] as const;

export function SiteFooter() {
	const { t } = useTranslation();
	return (
		<footer className="mt-20 bg-ink-900 text-ink-300">
			<div className="relative overflow-hidden">
				<div
					aria-hidden
					className="jali pointer-events-none absolute inset-0 opacity-[0.04]"
				/>
				<div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-5">
					<div className="lg:col-span-1">
						<div className="flex items-center gap-2.5 text-white">
							<BrandMark size={40} />
							<span className="font-bold font-display text-lg leading-tight">
								GSRTC
							</span>
						</div>
						<p className="mt-4 text-ink-400 text-sm leading-relaxed">
							{t(
								"Gujarat State Road Transport Corporation. Steering miles with smiles since 1960."
							)}
						</p>
						<a
							className="mt-4 inline-flex items-center gap-2 font-semibold text-sm text-white hover:text-saffron-300"
							href="tel:18002336666"
						>
							<PhoneIcon height={15} width={15} />
							{t("Toll Free")} · 1800 233 666666
						</a>
					</div>

					{FOOTER_COLUMNS.map((column) => (
						<nav key={column.heading}>
							<h2 className="font-semibold text-sm text-white">
								{t(column.heading)}
							</h2>
							<ul className="mt-4 space-y-2.5">
								{column.links.map((link) => (
									<li key={link}>
										<Link
											className="text-ink-400 text-sm transition-colors hover:text-saffron-300"
											params={{ slug: slugify(link) }}
											to="/p/$slug"
										>
											{t(link)}
										</Link>
									</li>
								))}
							</ul>
						</nav>
					))}
				</div>
			</div>

			{/* Apps + browser compatibility */}
			<div className="border-ink-700/60 border-t">
				<div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-6 sm:px-6 md:flex-row md:items-center">
					<div className="flex flex-wrap items-center gap-3">
						<a
							className="inline-flex items-center gap-2 rounded-full bg-ink-800 px-4 py-2 font-medium text-sm text-white transition hover:bg-ink-700"
							href="/"
						>
							<AndroidIcon height={18} width={18} />
							{t("Download Android App")}
						</a>
						<a
							className="inline-flex items-center gap-2 rounded-full bg-ink-800 px-4 py-2 font-medium text-sm text-white transition hover:bg-ink-700"
							href="/"
						>
							<AppleIcon height={18} width={18} />
							{t("Download iOS App")}
						</a>
					</div>
					<div className="flex items-center gap-3 text-ink-400 text-xs">
						<span>{t("Browser compatibility:")}</span>
						<span className="flex gap-2">
							{BROWSERS.map((browser) => (
								<span
									className="grid h-7 w-7 place-items-center rounded-full bg-ink-800 font-semibold text-[10px] text-white"
									key={browser}
									title={browser}
								>
									{browser.slice(0, 2)}
								</span>
							))}
						</span>
					</div>
				</div>
			</div>

			<div className="border-ink-700/60 border-t">
				<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-ink-500 text-xs sm:flex-row sm:px-6">
					<p>
						© {new Date().getFullYear()} GSRTC. {t("All Rights Reserved.")}
					</p>
					<div className="flex items-center gap-2">
						<p>
							{t("Version Details:")} 20/07/2026, 20:00 PM ·{" "}
							{t("A redesign concept")}
						</p>
						<span aria-hidden>·</span>
						<a
							className="rounded-full border border-saffron-400/50 bg-saffron-400/10 px-2.5 py-1 font-semibold text-saffron-200 transition-colors hover:border-saffron-300 hover:bg-saffron-400/20 hover:text-white"
							href="https://github.com/NayanVR/gsrtc-rewired/"
							rel="noopener noreferrer"
							target="_blank"
						>
							GitHub
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
