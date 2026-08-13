import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "#/components/brand-mark";
import {
	AccessibilityIcon,
	BellIcon,
	ChevronDownIcon,
	GlobeIcon,
	MailIcon,
	MenuIcon,
	PhoneIcon,
	UserIcon,
} from "#/components/icons";

const NAV_LINKS = [
	{ hasMenu: true, label: "Online Users" },
	{ hasMenu: true, label: "GSRTC / Agent Login" },
	{ hasMenu: false, label: "Sharvan Tirth Darshan" },
	{ hasMenu: true, label: "Bus Pass" },
	{ hasMenu: false, label: "Unity Booking" },
] as const;

export function SiteHeader() {
	const [open, setOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md">
			{/* Utility strip */}
			<div className="border-ink-100 border-b bg-canvas-2/80">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 py-1.5 text-xs sm:px-6">
					<div className="hidden items-center gap-4 text-ink-600 md:flex">
						<a
							className="flex items-center gap-1.5 hover:text-saffron-600"
							href="mailto:customer-support@gsrtc.org"
						>
							<MailIcon height={13} width={13} />
							customer-support@gsrtc.org
						</a>
						<a
							className="hidden hover:text-saffron-600 lg:inline"
							href="mailto:refund@gsrtc.org"
						>
							refund@gsrtc.org
						</a>
						<a
							className="flex items-center gap-1.5 font-medium hover:text-saffron-600"
							href="tel:18002336666"
						>
							<PhoneIcon height={13} width={13} />
							1800 233 666666
						</a>
					</div>
					<div className="flex flex-1 items-center justify-end gap-x-4 gap-y-1 text-ink-600">
						<a
							className="flex items-center gap-1 hover:text-brand-600"
							href="/"
						>
							<UserIcon height={13} width={13} />
							GSRTC Login
						</a>
						<a
							className="flex items-center gap-1 hover:text-brand-600"
							href="/"
						>
							<UserIcon height={13} width={13} />
							Bus Pass Login
						</a>
						<a
							className="flex items-center gap-1 font-semibold text-saffron-600 hover:text-saffron-700"
							href="/"
						>
							<BellIcon height={13} width={13} />
							Alert
						</a>
						<a
							className="hidden items-center gap-1 hover:text-brand-600 sm:flex"
							href="/"
						>
							<AccessibilityIcon height={13} width={13} />
							Accessibility
						</a>
						<button
							className="flex items-center gap-1 hover:text-brand-600"
							type="button"
						>
							<GlobeIcon height={13} width={13} />
							English
							<ChevronDownIcon height={12} width={12} />
						</button>
					</div>
				</div>
			</div>

			{/* Main bar */}
			<div className="border-ink-100 border-b">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
					<Link className="flex items-center gap-3" to="/">
						<BrandMark className="shrink-0" size={46} />
						<span className="leading-tight">
							<span className="block font-bold font-display text-base text-ink-900 tracking-tight sm:text-lg">
								Gujarat State Road Transport
							</span>
							<span className="block text-ink-500 text-xs">
								ગુજરાત રાજ્ય માર્ગ વાહન વ્યવહાર નિગમ · Steering Miles with Smiles
							</span>
						</span>
					</Link>

					<nav className="hidden items-center gap-0.5 lg:flex">
						{NAV_LINKS.map((link) => (
							<button
								className="flex items-center gap-1 rounded-full px-3 py-2 font-medium text-ink-700 text-sm transition-colors hover:bg-saffron-50 hover:text-saffron-700"
								key={link.label}
								type="button"
							>
								{link.label}
								{link.hasMenu ? (
									<ChevronDownIcon height={13} width={13} />
								) : null}
							</button>
						))}
					</nav>

					<button
						aria-expanded={open}
						aria-label="Toggle menu"
						className="rounded-full border border-ink-200 p-2 text-ink-700 lg:hidden"
						onClick={() => setOpen((value) => !value)}
						type="button"
					>
						<MenuIcon />
					</button>
				</div>
			</div>

			{open ? (
				<nav className="border-ink-100 border-b bg-surface px-4 py-3 sm:px-6 lg:hidden">
					{NAV_LINKS.map((link) => (
						<button
							className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium text-ink-700 hover:bg-saffron-50"
							key={link.label}
							onClick={() => setOpen(false)}
							type="button"
						>
							{link.label}
							{link.hasMenu ? <ChevronDownIcon height={16} width={16} /> : null}
						</button>
					))}
				</nav>
			) : null}
		</header>
	);
}
