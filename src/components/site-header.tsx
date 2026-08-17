import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { BrandMark } from "#/components/brand-mark";
import {
	BellIcon,
	ChevronDownIcon,
	GlobeIcon,
	MailIcon,
	MenuIcon,
	PhoneIcon,
	UserIcon,
} from "#/components/icons";
import { SiteSearch } from "#/components/site-search";
import { NAV, type NavGroup, slugify } from "#/data/site-nav";
import { LANGUAGES, useLanguage } from "#/lib/i18n";

export function SiteHeader() {
	const [menuOpen, setMenuOpen] = useState(false);

	return (
		<header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md">
			<UtilityStrip />

			<div className="border-ink-100 border-b">
				<div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
					<Link className="flex shrink-0 items-center gap-3" to="/">
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

					<div className="flex flex-1 justify-center">
						<div className="w-full max-w-md">
							<SiteSearch />
						</div>
					</div>

					<button
						aria-expanded={menuOpen}
						aria-label="Toggle navigation menu"
						className="shrink-0 rounded-full border border-ink-200 p-2 text-ink-700 transition hover:border-saffron-300 hover:text-saffron-700"
						onClick={() => setMenuOpen((value) => !value)}
						type="button"
					>
						<MenuIcon />
					</button>
				</div>
			</div>

			{menuOpen ? <NavMenu onNavigate={() => setMenuOpen(false)} /> : null}
		</header>
	);
}

function UtilityStrip() {
	return (
		<div className="border-ink-100 border-b bg-canvas-2/80">
			<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-1 px-4 py-1.5 text-xs sm:px-6">
				<div
					className="hidden items-center gap-4 text-ink-600 md:flex"
					data-no-translate
				>
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
					<Link
						className="flex items-center gap-1 hover:text-brand-600"
						params={{ slug: "gsrtc-agent-login" }}
						to="/p/$slug"
					>
						<UserIcon height={13} width={13} />
						GSRTC Login
					</Link>
					<Link
						className="flex items-center gap-1 hover:text-brand-600"
						params={{ slug: "new-commuter-bus-pass" }}
						to="/p/$slug"
					>
						<UserIcon height={13} width={13} />
						Bus Pass Login
					</Link>
					<Link
						className="flex items-center gap-1 font-semibold text-saffron-600 hover:text-saffron-700"
						params={{ slug: "press-release" }}
						to="/p/$slug"
					>
						<BellIcon height={13} width={13} />
						Alert
					</Link>
					<LanguageMenu />
				</div>
			</div>
		</div>
	);
}

function LanguageMenu() {
	const { lang, setLang } = useLanguage();
	const [open, setOpen] = useState(false);
	const current = LANGUAGES.find((item) => item.code === lang) ?? LANGUAGES[0];

	return (
		<div className="relative" data-no-translate>
			<button
				aria-expanded={open}
				aria-label="Change language"
				className="flex items-center gap-1 hover:text-brand-600"
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				<GlobeIcon height={13} width={13} />
				{current.label}
				<ChevronDownIcon height={12} width={12} />
			</button>
			{open ? (
				<div className="absolute right-0 z-50 mt-1.5 min-w-36 origin-top animate-pop-in overflow-hidden rounded-xl border border-ink-100 bg-surface py-1 shadow-pop">
					{LANGUAGES.map((item) => (
						<button
							className={`block w-full px-3.5 py-1.5 text-left text-sm transition-colors hover:bg-saffron-50 ${
								item.code === lang
									? "font-semibold text-saffron-700"
									: "text-ink-700"
							}`}
							key={item.code}
							onClick={() => {
								setLang(item.code);
								setOpen(false);
							}}
							type="button"
						>
							{item.label}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}

// Revealed by the single menu button — one panel instead of a permanent nav
// bar. Groups flow into columns so it stays compact on wider screens.
function NavMenu({ onNavigate }: { onNavigate: () => void }) {
	return (
		<nav className="border-ink-100 border-b bg-surface">
			<div className="mx-auto grid max-w-6xl gap-x-6 gap-y-1 px-4 py-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
				{NAV.map((group) => (
					<MobileNavItem
						group={group}
						key={group.label}
						onNavigate={onNavigate}
					/>
				))}
			</div>
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
				<div className="mb-1 ml-3 animate-pop-in border-ink-100 border-l pl-2">
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
