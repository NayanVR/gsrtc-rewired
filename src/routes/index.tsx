import { createFileRoute, Link } from "@tanstack/react-router";
import {
	BusArt,
	DwarkaArt,
	QrCode,
	RannOfKutchArt,
	SomnathArt,
	StatueOfUnityArt,
	TrophyArt,
} from "#/components/artwork";
import { HeroSlideshow } from "#/components/hero-slideshow";
import {
	AndroidIcon,
	AppleIcon,
	ArrowRightIcon,
	StarIcon,
	TrackIcon,
	UsersGroupIcon,
	WalletIcon,
} from "#/components/icons";
import { SearchForm } from "#/components/search-form";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { formatFare } from "#/data/trips";

export const Route = createFileRoute("/")({ component: Home });

const ACHIEVEMENT = [
	{ year: "2018", seats: 74_368, revenue: "₹1.53 Cr" },
	{ year: "2021", seats: 94_539, revenue: "₹1.80 Cr" },
	{ year: "2022", seats: 114_880, revenue: "₹2.10 Cr" },
	{ year: "2023", seats: 132_177, revenue: "₹2.98 Cr" },
	{ year: "2024", seats: 141_468, revenue: "₹3.16 Cr" },
	{ year: "2025", seats: 133_043, revenue: "₹3.19 Cr" },
] as const;

const PEAK_SEATS = 141_468;

const GROWING_NUMBERS = [
	{ label: "Android App Downloads", value: "63,92,501", icon: AndroidIcon },
	{ label: "iOS App Downloads", value: "13,09,035", icon: AppleIcon },
	{ label: "Wallet Users", value: "12,86,369", icon: WalletIcon },
	{ label: "Visitors Count", value: "31,37,16,988", icon: UsersGroupIcon },
] as const;

const POLICIES = [
	{ label: "બુકિંગ નીતિ (Gujarati)", note: "Booking policy" },
	{ label: "बुकिंग नीति (Hindi)", note: "Booking policy" },
	{ label: "Booking Policy (English)", note: "Booking policy" },
] as const;

const POPULAR_ROUTES = [
	{ from: "Ahmedabad", to: "Vadodara", fare: 120 },
	{ from: "Vadodara", to: "Surat", fare: 147 },
	{ from: "Ahmedabad", to: "Rajkot", fare: 220 },
	{ from: "Surat", to: "Ahmedabad", fare: 260 },
] as const;

const DESTINATIONS = [
	{
		name: "Statue of Unity",
		tag: "Kevadia",
		blurb: "The world's tallest statue, on the banks of the Narmada.",
		Art: StatueOfUnityArt,
	},
	{
		name: "Somnath",
		tag: "Gir Somnath",
		blurb: "First among the twelve sacred Jyotirlinga shrines.",
		Art: SomnathArt,
	},
	{
		name: "Rann of Kutch",
		tag: "Bhuj",
		blurb: "The vast white salt desert at Dhordo — surreal and serene.",
		Art: RannOfKutchArt,
	},
	{
		name: "Dwarka",
		tag: "Devbhumi Dwarka",
		blurb: "The revered coastal pilgrimage city of Lord Krishna.",
		Art: DwarkaArt,
	},
] as const;

function Home() {
	return (
		<>
			<SiteHeader />
			<NoteStrip />
			<main id="main">
				<Hero />
				<Milestone />
				<QuickAccess />
				<GrowingNumbers />
				<LiveTracking />
				<Destinations />
			</main>
			<SiteFooter />
		</>
	);
}

function NoteStrip() {
	return (
		<div className="border-saffron-200 border-b bg-saffron-50">
			<div className="mx-auto max-w-6xl px-4 py-2 text-saffron-800 text-sm sm:px-6">
				<span className="font-semibold">Note:</span> Please do not press the
				forward or back buttons during a transaction. 📌 ટિકિટ બુક કરતા પહેલા
				એકવાર બ્રાઉઝર હિસ્ટ્રી ક્લિયર કરવી.
			</div>
		</div>
	);
}

function Hero() {
	return (
		<section className="relative overflow-hidden">
			<div aria-hidden className="mesh-hero absolute inset-0">
				<div className="grain" />
			</div>
			<div aria-hidden className="jali absolute inset-0 opacity-[0.06]" />
			<div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-24 sm:px-6 sm:pt-14 lg:grid-cols-2">
				<div>
					<span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-medium text-sm text-white ring-1 ring-white/25 backdrop-blur">
						<StarIcon className="text-saffron-200" height={14} width={14} />
						New record · 24 October 2025
					</span>
					<h1 className="mt-4 font-display font-extrabold text-4xl text-white leading-[1.05] tracking-tight sm:text-5xl">
						Travel Gujarat with GSRTC.
					</h1>
					<p className="mt-4 max-w-md text-lg text-white/85 leading-relaxed">
						Volvo, Sleeper, Express and more across thousands of routes. Live
						seat maps, transparent fares, and a calmer way to book.
					</p>
				</div>
				<HeroSlideshow />
			</div>

			{/* Booking widget overlapping the hero base */}
			<div className="relative mx-auto -mt-16 max-w-6xl px-4 pb-10 sm:px-6">
				<SearchForm showTabs variant="hero" />
			</div>
		</section>
	);
}

function Milestone() {
	return (
		<section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
			<div className="grid gap-6 rounded-3xl border border-ink-100 bg-surface p-6 shadow-card sm:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-center">
				<div>
					<TrophyArt className="mb-3 h-10 w-10" />
					<span className="inline-flex items-center gap-2 rounded-full bg-saffron-50 px-3 py-1 font-semibold text-saffron-700 text-xs">
						<StarIcon height={13} width={13} />
						New milestone · 24 October 2025
					</span>
					<h2 className="mt-3 font-bold font-display text-2xl text-ink-900 tracking-tight">
						A record number of seats booked, and revenue generated.
					</h2>
					<p className="mt-2 text-ink-500 leading-relaxed">
						GSRTC OPRS broke its own single-day record. Yearly seats booked
						through the online portal:
					</p>
				</div>

				<div className="flex items-end gap-3">
					{ACHIEVEMENT.map((row) => {
						const height = Math.round((row.seats / PEAK_SEATS) * 120);
						const isPeak = row.year === "2025";
						return (
							<div
								className="flex flex-1 flex-col items-center gap-2"
								key={row.year}
							>
								<span className="font-semibold text-[11px] text-ink-500">
									{(row.seats / 1000).toFixed(0)}k
								</span>
								<div
									className={`w-full rounded-t-lg ${
										isPeak ? "gradient-surface" : "bg-ink-100"
									}`}
									style={{ height: `${Math.max(height, 20)}px` }}
								/>
								<span className="text-[11px] text-ink-500">{row.year}</span>
								<span className="text-[10px] text-ink-400">{row.revenue}</span>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function QuickAccess() {
	return (
		<section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
			<div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
				{/* Popular routes */}
				<div className="rounded-3xl border border-ink-100 bg-surface p-6 shadow-card">
					<h2 className="font-bold font-display text-ink-900 text-xl">
						Popular routes
					</h2>
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						{POPULAR_ROUTES.map((route) => (
							<Link
								className="group flex items-center justify-between rounded-2xl border border-ink-100 bg-canvas px-4 py-3.5 transition hover:border-saffron-300 hover:bg-saffron-50"
								key={`${route.from}-${route.to}`}
								search={{
									from: route.from,
									to: route.to,
									date: new Date().toISOString().slice(0, 10),
									passengers: 1,
								}}
								to="/search"
							>
								<span className="flex items-center gap-2 font-semibold text-ink-900 text-sm">
									{route.from}
									<ArrowRightIcon
										className="text-ink-400"
										height={14}
										width={14}
									/>
									{route.to}
								</span>
								<span className="text-ink-500 text-xs">
									from {formatFare(route.fare)}
								</span>
							</Link>
						))}
					</div>
				</div>

				{/* Feedback + policies */}
				<div className="overflow-hidden rounded-3xl border border-ink-100 bg-surface shadow-card">
					<div className="mesh-band relative overflow-hidden p-5">
						<div aria-hidden className="grain" />
						<div className="relative flex items-center gap-4">
							<div className="rounded-2xl bg-white/95 p-2 shadow-sm">
								<QrCode size={84} />
							</div>
							<div className="flex-1 text-white">
								<h2 className="font-bold font-display text-lg leading-tight">
									Rate your GSRTC journey
								</h2>
								<p className="mt-1 text-sm text-white/85">
									Scan the QR or visit www.feedback.gsrtc.org
								</p>
								<BusArt className="mt-2 h-9 w-auto" />
							</div>
						</div>
					</div>
					<div className="space-y-2 p-5">
						{POLICIES.map((policy) => (
							<a
								className="flex items-center justify-between rounded-xl bg-canvas px-4 py-2.5 font-medium text-ink-800 text-sm transition hover:bg-saffron-50 hover:text-saffron-700"
								href="/"
								key={policy.label}
							>
								{policy.label}
								<ArrowRightIcon height={15} width={15} />
							</a>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function GrowingNumbers() {
	return (
		<section className="border-ink-100 border-y bg-surface-2">
			<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
				<h2 className="text-center font-bold font-display text-2xl text-ink-900 tracking-tight sm:text-3xl">
					GSRTC growing numbers
				</h2>
				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{GROWING_NUMBERS.map((item) => (
						<div
							className="rounded-2xl border border-ink-100 bg-surface p-5 shadow-card"
							key={item.label}
						>
							<span className="gradient-text inline-flex">
								<item.icon height={26} width={26} />
							</span>
							<p className="mt-3 font-display font-extrabold text-2xl text-ink-900">
								{item.value}
							</p>
							<p className="mt-0.5 text-ink-500 text-sm">{item.label}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function LiveTracking() {
	const cards = [
		{ label: "GSRTC Live Tracking", sub: "Android", icon: AndroidIcon },
		{ label: "GSRTC Live Tracking", sub: "iOS", icon: AppleIcon },
	];
	return (
		<section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
			<div className="flex items-center gap-3">
				<span className="gradient-text">
					<TrackIcon height={26} width={26} />
				</span>
				<h2 className="font-bold font-display text-2xl text-ink-900 tracking-tight sm:text-3xl">
					GSRTC live tracking
				</h2>
			</div>
			<div className="mt-6 grid gap-4 sm:grid-cols-2">
				{cards.map((card) => (
					<a
						className="group flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-5 shadow-card transition hover:border-saffron-300"
						href="/"
						key={card.sub}
					>
						<span className="flex items-center gap-3">
							<span className="grid h-11 w-11 place-items-center rounded-xl bg-canvas text-ink-700">
								<card.icon height={22} width={22} />
							</span>
							<span>
								<span className="block font-semibold text-ink-900">
									{card.label}
								</span>
								<span className="block text-ink-500 text-sm">
									Download for {card.sub}
								</span>
							</span>
						</span>
						<ArrowRightIcon
							className="text-ink-400 transition group-hover:translate-x-1 group-hover:text-saffron-600"
							height={18}
							width={18}
						/>
					</a>
				))}
			</div>
		</section>
	);
}

function Destinations() {
	return (
		<section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
			<h2 className="font-bold font-display text-2xl text-ink-900 tracking-tight sm:text-3xl">
				Top destinations
			</h2>
			<p className="mt-2 max-w-2xl text-ink-500">
				Popular pilgrimage spots, tourist cities and key commercial hubs — GSRTC
				connects you to every corner of Gujarat through its extensive network.
			</p>
			<div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{DESTINATIONS.map((place) => (
					<article
						className="group overflow-hidden rounded-2xl border border-ink-100 bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
						key={place.name}
					>
						<div className="relative h-36">
							<place.Art className="h-full w-full transition duration-500 group-hover:scale-105" />
							<span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 font-medium text-white text-xs ring-1 ring-white/25 backdrop-blur">
								{place.tag}
							</span>
						</div>
						<div className="p-5">
							<h3 className="font-bold font-display text-ink-900">
								{place.name}
							</h3>
							<p className="mt-1.5 text-ink-500 text-sm leading-relaxed">
								{place.blurb}
							</p>
						</div>
					</article>
				))}
			</div>
		</section>
	);
}
