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
import { NAV, type NavGroup, slugify } from "#/data/site-nav";

export function SiteHeader() {
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md">
			<UtilityStrip />

			<div className="border-ink-100 border-b">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
					<Link className="flex items-center gap-3" to="/">
						<BrandMark className="shrink-0" size={46} />
						<span className="leading-tight">
							<span className="block font-bold font-display text-base text-ink-900 tracking-tight sm:text-lg">
								Gujarat State Road Transport
							</span>
							<span className="block text-ink-500 text-xs">
								ગુજરાત રાજ્ય માર્ગ વાહન વ્યવહાર નિગમ
							</span>
						</span>
					</Link>

					<nav className="hidden items-center gap-0.5 lg:flex">
						{NAV.map((group) => (
							<DesktopNavItem group={group} key={group.label} />
						))}
					</nav>

					<button
						aria-expanded={mobileOpen}
						aria-label="Toggle menu"
						className="rounded-full border border-ink-200 p-2 text-ink-700 lg:hidden"
						onClick={() => setMobileOpen((value) => !value)}
						type="button"
					>
						<MenuIcon />
					</button>
				</div>
			</div>

			{mobileOpen ? (
				<MobileNav onNavigate={() => setMobileOpen(false)} />
			) : null}
		</header>
	);
}

function UtilityStrip() {
	return (
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
					<Link className="flex items-center gap-1 hover:text-brand-600" to="/">
						<UserIcon height={13} width={13} />
						GSRTC Login
					</Link>
					<Link className="flex items-center gap-1 hover:text-brand-600" to="/">
						<UserIcon height={13} width={13} />
						Bus Pass Login
					</Link>
					<Link
						className="flex items-center gap-1 font-semibold text-saffron-600 hover:text-saffron-700"
						to="/"
					>
						<BellIcon height={13} width={13} />
						Alert
					</Link>
					<Link
						className="hidden items-center gap-1 hover:text-brand-600 sm:flex"
						to="/"
					>
						<AccessibilityIcon height={13} width={13} />
						Accessibility
					</Link>
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
	);
}

const NAV_ITEM_CLASS =
	"flex items-center gap-1 rounded-full px-3 py-2 font-medium text-ink-700 text-sm transition-colors hover:bg-saffron-50 hover:text-saffron-700";

function DesktopNavItem({ group }: { group: NavGroup }) {
	const [open, setOpen] = useState(false);

	if (!group.children) {
		return (
			<Link
				className={NAV_ITEM_CLASS}
				params={{ slug: slugify(group.label) }}
				to="/p/$slug"
			>
				{group.label}
			</Link>
		);
	}

	return (
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover-to-open is a mouse enhancement; the button toggles for keyboard
		// biome-ignore lint/a11y/noStaticElementInteractions: hover-to-open is a mouse enhancement; the button toggles for keyboard
		<div
			className="relative"
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
		>
			<button
				aria-expanded={open}
				className={NAV_ITEM_CLASS}
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				{group.label}
				<ChevronDownIcon height={13} width={13} />
			</button>
			{open ? (
				<div className="absolute left-0 z-50 mt-1 min-w-56 overflow-hidden rounded-2xl border border-ink-100 bg-surface py-1.5 shadow-pop">
					{group.children.map((label) => (
						<Link
							className="block px-4 py-2 text-ink-700 text-sm transition-colors hover:bg-saffron-50 hover:text-saffron-700"
							key={label}
							onClick={() => setOpen(false)}
							params={{ slug: slugify(label) }}
							to="/p/$slug"
						>
							{label}
						</Link>
					))}
				</div>
			) : null}
		</div>
	);
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
	return (
		<nav className="border-ink-100 border-b bg-surface px-4 py-3 sm:px-6 lg:hidden">
			{NAV.map((group) => (
				<MobileNavItem
					group={group}
					key={group.label}
					onNavigate={onNavigate}
				/>
			))}
		</nav>
	);
}

const MOBILE_LINK_CLASS =
	"flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left font-medium text-ink-700 hover:bg-saffron-50";

function MobileNavItem({
	group,
	onNavigate,
}: {
	group: NavGroup;
	onNavigate: () => void;
}) {
	const [open, setOpen] = useState(false);

	if (!group.children) {
		return (
			<Link
				className={MOBILE_LINK_CLASS}
				onClick={onNavigate}
				params={{ slug: slugify(group.label) }}
				to="/p/$slug"
			>
				{group.label}
			</Link>
		);
	}

	return (
		<div>
			<button
				aria-expanded={open}
				className={MOBILE_LINK_CLASS}
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				{group.label}
				<ChevronDownIcon height={16} width={16} />
			</button>
			{open ? (
				<div className="mb-1 ml-3 border-ink-100 border-l pl-2">
					{group.children.map((label) => (
						<Link
							className="block rounded-lg px-3 py-2 text-ink-600 text-sm hover:bg-saffron-50 hover:text-saffron-700"
							key={label}
							onClick={onNavigate}
							params={{ slug: slugify(label) }}
							to="/p/$slug"
						>
							{label}
						</Link>
					))}
				</div>
			) : null}
		</div>
	);
}
