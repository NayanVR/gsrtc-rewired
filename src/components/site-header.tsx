import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BusIcon, MenuIcon, PhoneIcon } from "#/components/icons";

const NAV_LINKS = [
	{ label: "Book tickets", to: "/" },
	{ label: "Bus pass", to: "/" },
	{ label: "Cancel / refund", to: "/" },
	{ label: "Track bus", to: "/" },
	{ label: "Help", to: "/" },
] as const;

export function SiteHeader() {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 border-ink-200 border-b bg-surface/90 backdrop-blur">
			{/* Utility strip */}
			<div className="hidden bg-brand-900 text-brand-100 md:block">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-1.5 text-xs">
					<p>Government of Gujarat · Official ticketing portal</p>
					<div className="flex items-center gap-4">
						<a
							className="flex items-center gap-1.5 hover:text-white"
							href="tel:18002336666"
						>
							<PhoneIcon height={14} width={14} />
							1800 233 666666
						</a>
						<a className="hover:text-white" href="/">
							English
						</a>
						<a className="hover:text-white" href="/">
							Accessibility
						</a>
					</div>
				</div>
			</div>

			<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
				<Link className="flex items-center gap-3" to="/">
					<span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
						<BusIcon height={24} width={24} />
					</span>
					<span className="leading-tight">
						<span className="block font-bold text-ink-900 text-lg tracking-tight">
							GSRTC
						</span>
						<span className="block text-ink-500 text-xs">
							Gujarat State Road Transport
						</span>
					</span>
				</Link>

				<nav className="hidden items-center gap-1 lg:flex">
					{NAV_LINKS.map((link) => (
						<Link
							className="rounded-lg px-3 py-2 font-medium text-ink-600 text-sm transition-colors hover:bg-brand-50 hover:text-brand-700"
							key={link.label}
							to={link.to}
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2">
					<button
						className="hidden rounded-lg border border-ink-200 px-4 py-2 font-semibold text-ink-700 text-sm transition-colors hover:border-brand-300 hover:text-brand-700 sm:block"
						type="button"
					>
						Login
					</button>
					<button
						aria-expanded={open}
						aria-label="Toggle menu"
						className="rounded-lg border border-ink-200 p-2 text-ink-700 lg:hidden"
						onClick={() => setOpen((value) => !value)}
						type="button"
					>
						<MenuIcon />
					</button>
				</div>
			</div>

			{open ? (
				<nav className="border-ink-200 border-t bg-surface px-6 py-3 lg:hidden">
					{NAV_LINKS.map((link) => (
						<Link
							className="block rounded-lg px-3 py-2.5 font-medium text-ink-700 hover:bg-brand-50"
							key={link.label}
							onClick={() => setOpen(false)}
							to={link.to}
						>
							{link.label}
						</Link>
					))}
				</nav>
			) : null}
		</header>
	);
}
