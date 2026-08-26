import { Link } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { useTranslation } from "#/lib/i18n";

interface PageShellProps {
	blurb?: string;
	children?: React.ReactNode;
	title: string;
}

// Shared layout for every stub page: header, a titled band and a content slot.
export function PageShell({ title, blurb, children }: PageShellProps) {
	const { t } = useTranslation();
	return (
		<>
			<SiteHeader />
			<main className="flex min-h-[60vh] flex-col" id="main">
				<div className="mesh-hero">
					<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
						<nav className="mb-3 text-sm text-white/70">
							<Link className="hover:text-white" to="/">
								{t("Home")}
							</Link>
							<span className="px-1.5">/</span>
							<span className="text-white/90">{t(title)}</span>
						</nav>
						<h1 className="font-display font-extrabold text-3xl text-white tracking-tight sm:text-4xl">
							{t(title)}
						</h1>
						{blurb ? (
							<p className="mt-3 max-w-2xl text-lg text-white/80">{t(blurb)}</p>
						) : null}
					</div>
				</div>

				{/* Faint jali lattice fills the otherwise-blank content area */}
				<div className="relative flex-1">
					<div
						aria-hidden
						className="jali-ink pointer-events-none absolute inset-0 opacity-[0.04]"
					/>
					<div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
						{children ?? (
							<div className="rounded-3xl border border-ink-100 bg-surface p-8 shadow-card">
								<p className="text-ink-600 leading-relaxed">
									{t(
										"This page is part of the GSRTC redesign concept. The full experience is on its way. Check back soon."
									)}
								</p>
								<Link
									className="gradient-surface mt-5 inline-flex rounded-xl px-5 py-2.5 font-semibold text-white shadow-sm transition hover:brightness-105"
									to="/"
								>
									{t("Back to home")}
								</Link>
							</div>
						)}
					</div>
				</div>
			</main>
			<SiteFooter />
		</>
	);
}
