import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRightIcon,
	CheckIcon,
	ClockIcon,
	PinIcon,
	ShieldCheckIcon,
	StarIcon,
} from "#/components/icons";
import { SearchForm } from "#/components/search-form";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { BUS_TYPE_META, type BusType, formatFare } from "#/data/trips";

export const Route = createFileRoute("/")({ component: Home });

const POPULAR_ROUTES = [
	{ from: "Ahmedabad", to: "Vadodara", fare: 120, mins: 120 },
	{ from: "Vadodara", to: "Surat", fare: 147, mins: 165 },
	{ from: "Ahmedabad", to: "Rajkot", fare: 220, mins: 240 },
	{ from: "Surat", to: "Ahmedabad", fare: 260, mins: 270 },
	{ from: "Rajkot", to: "Bhavnagar", fare: 180, mins: 210 },
	{ from: "Ahmedabad", to: "Bhuj", fare: 340, mins: 420 },
] as const;

const FEATURES = [
	{
		title: "Live seat availability",
		body: "Real-time seat maps so you always book what's actually free — no surprises at the counter.",
		icon: CheckIcon,
	},
	{
		title: "Secure 7-minute hold",
		body: "Your seat is locked while you pay. Government-grade, PCI-compliant payment gateway.",
		icon: ShieldCheckIcon,
	},
	{
		title: "On-time, tracked buses",
		body: "Follow your bus live and get boarding-point reminders before departure.",
		icon: ClockIcon,
	},
] as const;

const STATS = [
	{ label: "Buses daily", value: "8,000+" },
	{ label: "Routes covered", value: "18,000+" },
	{ label: "App downloads", value: "77 lakh+" },
	{ label: "On-time record", value: "94%" },
] as const;

const DESTINATIONS = [
	{
		name: "Statue of Unity",
		tag: "Kevadia",
		blurb: "The world's tallest statue on the Narmada.",
	},
	{
		name: "Somnath",
		tag: "Gir Somnath",
		blurb: "First among the twelve Jyotirlinga shrines.",
	},
	{
		name: "Rann of Kutch",
		tag: "Bhuj",
		blurb: "The vast white salt desert at Dhordo.",
	},
	{
		name: "Dwarka",
		tag: "Devbhumi Dwarka",
		blurb: "The revered coastal pilgrimage city.",
	},
] as const;

function Home() {
	return (
		<>
			<SiteHeader />
			<main id="main">
				<Hero />
				<PopularRoutes />
				<BusTypes />
				<Features />
				<Stats />
				<Destinations />
			</main>
			<SiteFooter />
		</>
	);
}

function Hero() {
	return (
		<section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900">
			<div
				aria-hidden
				className="absolute inset-0 opacity-30"
				style={{
					backgroundImage:
						"radial-gradient(60rem 30rem at 80% -10%, rgba(255,255,255,0.35), transparent), radial-gradient(40rem 24rem at 0% 120%, rgba(89,140,255,0.5), transparent)",
				}}
			/>
			<div className="relative mx-auto max-w-6xl px-6 pt-14 pb-28 sm:pt-20">
				<div className="max-w-2xl">
					<span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-medium text-brand-100 text-sm ring-1 ring-white/20">
						<StarIcon className="text-yellow-300" height={14} width={14} />
						Official GSRTC ticketing · Government of Gujarat
					</span>
					<h1 className="mt-5 font-extrabold text-4xl text-white leading-[1.1] tracking-tight sm:text-5xl">
						Book your Gujarat bus journey in under a minute.
					</h1>
					<p className="mt-4 text-brand-100 text-lg leading-relaxed">
						Compare Volvo, Sleeper, Express and more across 18,000 routes. Live
						seat maps, transparent fares, and a booking flow that just works.
					</p>
				</div>

				<div className="mt-8">
					<SearchForm variant="hero" />
				</div>
			</div>

			{/* soft curve into next section */}
			<div className="relative -mb-px h-8 bg-canvas [clip-path:ellipse(75%_100%_at_50%_100%)]" />
		</section>
	);
}

function SectionHeading({
	eyebrow,
	title,
	action,
}: {
	eyebrow: string;
	title: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-end justify-between gap-4">
			<div>
				<p className="font-semibold text-brand-600 text-sm uppercase tracking-wide">
					{eyebrow}
				</p>
				<h2 className="mt-1 font-bold text-2xl text-ink-900 tracking-tight sm:text-3xl">
					{title}
				</h2>
			</div>
			{action}
		</div>
	);
}

function PopularRoutes() {
	return (
		<section className="mx-auto max-w-6xl px-6 py-14">
			<SectionHeading eyebrow="Frequently travelled" title="Popular routes" />
			<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{POPULAR_ROUTES.map((route) => (
					<Link
						className="group flex items-center justify-between rounded-2xl border border-ink-200 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop"
						key={`${route.from}-${route.to}`}
						search={{
							from: route.from,
							to: route.to,
							date: new Date().toISOString().slice(0, 10),
							passengers: 1,
						}}
						to="/search"
					>
						<div>
							<div className="flex items-center gap-2 font-semibold text-ink-900">
								{route.from}
								<ArrowRightIcon
									className="text-ink-400"
									height={16}
									width={16}
								/>
								{route.to}
							</div>
							<p className="mt-1 text-ink-500 text-sm">
								from {formatFare(route.fare)} · {Math.round(route.mins / 60)}h
								onwards
							</p>
						</div>
						<span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
							<ArrowRightIcon height={16} width={16} />
						</span>
					</Link>
				))}
			</div>
		</section>
	);
}

function BusTypes() {
	const types = Object.entries(BUS_TYPE_META) as [
		BusType,
		(typeof BUS_TYPE_META)[BusType],
	][];
	return (
		<section className="border-ink-200 border-y bg-surface">
			<div className="mx-auto max-w-6xl px-6 py-14">
				<SectionHeading
					eyebrow="Choose your comfort"
					title="Every kind of bus"
				/>
				<div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{types.map(([type, meta]) => (
						<div
							className="rounded-2xl border border-ink-200 bg-canvas/60 p-5 transition hover:border-brand-300 hover:bg-brand-50/50"
							key={type}
						>
							<div className="flex items-center justify-between">
								<h3 className="font-bold text-ink-900 text-lg">{meta.label}</h3>
								<span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-semibold text-brand-700 text-xs">
									from {formatFare(meta.fareFrom)}
								</span>
							</div>
							<p className="mt-1.5 text-ink-500 text-sm">{meta.blurb}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Features() {
	return (
		<section className="mx-auto max-w-6xl px-6 py-16">
			<SectionHeading
				eyebrow="Why book here"
				title="A booking experience you can trust"
			/>
			<div className="mt-8 grid gap-5 md:grid-cols-3">
				{FEATURES.map((feature) => (
					<div
						className="rounded-2xl border border-ink-200 bg-surface p-6 shadow-card"
						key={feature.title}
					>
						<span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white">
							<feature.icon height={22} width={22} />
						</span>
						<h3 className="mt-4 font-bold text-ink-900 text-lg">
							{feature.title}
						</h3>
						<p className="mt-2 text-ink-500 text-sm leading-relaxed">
							{feature.body}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}

function Stats() {
	return (
		<section className="bg-brand-900">
			<div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
				{STATS.map((stat) => (
					<div className="text-center" key={stat.label}>
						<p className="font-extrabold text-3xl text-white tracking-tight sm:text-4xl">
							{stat.value}
						</p>
						<p className="mt-1 text-brand-200 text-sm">{stat.label}</p>
					</div>
				))}
			</div>
		</section>
	);
}

function Destinations() {
	return (
		<section className="mx-auto max-w-6xl px-6 py-16">
			<SectionHeading eyebrow="Explore Gujarat" title="Top destinations" />
			<div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{DESTINATIONS.map((place, index) => (
					<article
						className="group overflow-hidden rounded-2xl border border-ink-200 bg-surface shadow-card"
						key={place.name}
					>
						<div
							className="flex h-32 items-end p-4"
							style={{
								background: `linear-gradient(135deg, hsl(${
									216 + index * 24
								} 70% 46%), hsl(${230 + index * 20} 65% 32%))`,
							}}
						>
							<span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 font-medium text-white text-xs ring-1 ring-white/25">
								<PinIcon height={12} width={12} />
								{place.tag}
							</span>
						</div>
						<div className="p-5">
							<h3 className="font-bold text-ink-900">{place.name}</h3>
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
