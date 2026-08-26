import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	BusArt,
	DwarkaArt,
	QrCode,
	RannOfKutchArt,
	SomnathArt,
	StatueOfUnityArt,
} from "#/components/artwork";
import {
	AndroidIcon,
	AppleIcon,
	ArrowRightIcon,
	StarIcon,
	TrackIcon,
	UsersGroupIcon,
	WalletIcon,
} from "#/components/icons";
import { Milestone } from "#/components/milestone";
import { SearchForm } from "#/components/search-form";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { Card, CardTitle } from "#/components/ui/card";
import { formatFare } from "#/data/trips";

export const Route = createFileRoute("/")({ component: Home });

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
				{/* Search card straddles the hero's bottom edge, half over the image */}
				<div className="relative z-10 mx-auto -mt-16 max-w-6xl px-4 sm:-mt-20 sm:px-6">
					<SearchForm showTabs variant="hero" />
				</div>
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
	const message =
		"Note: This is not official site of GSRTC 📌 આ જી.એસ.આર.ટી.સી.ની સાઇટ નથી.";
	return (
		<div className="border-saffron-200 border-b bg-saffron-50">
			<div className="overflow-hidden py-1.5 text-saffron-800 text-sm">
				<p className="note-marquee flex w-max items-center gap-12 whitespace-nowrap">
					<span>{message}</span>
					<span aria-hidden>{message}</span>
				</p>
			</div>
		</div>
	);
}

const HERO_SLIDES = [
	{
		name: "Statue of Unity",
		tag: "Kevadia",
		image: "/hero/statue-of-unity.webp",
	},
	{ name: "Akshardham", tag: "Gandhinagar", image: "/hero/akshardham.webp" },
	{ name: "Rann of Kutch", tag: "Dhordo", image: "/hero/rann-of-kutch.webp" },
	{ name: "Somnath", tag: "Gir Somnath", image: "/hero/somnath.webp" },
	{ name: "Dwarka", tag: "Devbhumi Dwarka", image: "/hero/dwarka.webp" },
] as const;

// Fades the artwork into the blue mesh, keeping the left third clear for text.
const HERO_IMAGE_MASK = "linear-gradient(to right, transparent, #000 55%)";

const HERO_ROTATE_MS = 5000;

function Hero() {
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		if (paused) {
			return;
		}
		const id = setInterval(
			() => setIndex((value) => (value + 1) % HERO_SLIDES.length),
			HERO_ROTATE_MS
		);
		return () => clearInterval(id);
	}, [paused]);

	const active = HERO_SLIDES[index];

	return (
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover pause is a mouse-only enhancement; controls stay keyboard-accessible
		// biome-ignore lint/a11y/noStaticElementInteractions: hover pause is a mouse-only enhancement; controls stay keyboard-accessible
		<section
			className="relative overflow-hidden"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			{/* Consistent blue mesh base */}
			<div aria-hidden className="mesh-hero absolute inset-0">
				<div className="grain" />
			</div>
			<div aria-hidden className="jali absolute inset-0 opacity-[0.05]" />

			{/* Rotating landmark artwork, faded into the blue */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 right-0 w-full sm:w-[62%]"
			>
				{HERO_SLIDES.map((slide, i) => (
					<img
						alt=""
						className={`absolute inset-0 h-full w-full origin-bottom -translate-x-6 scale-110 object-cover object-bottom transition-opacity duration-[1200ms] sm:translate-x-0 ${
							i === index ? "opacity-100" : "opacity-0"
						}`}
						decoding="async"
						fetchPriority={i === 0 ? "high" : "low"}
						height={1350}
						key={slide.name}
						loading={i === 0 ? "eager" : "lazy"}
						src={slide.image}
						style={{
							maskImage: HERO_IMAGE_MASK,
							WebkitMaskImage: HERO_IMAGE_MASK,
						}}
						width={2400}
					/>
				))}
			</div>

			<div className="relative mx-auto flex min-h-[460px] max-w-6xl flex-col justify-between px-4 pt-10 pb-28 sm:px-6 sm:pt-12 sm:pb-32">
				<div className="max-w-xl">
					<h1 className="font-display font-extrabold text-4xl text-white leading-[1.05] tracking-tight sm:text-5xl">
						GSRTC: The way i want it to be.
					</h1>
					<p className="mt-4 max-w-md text-lg text-white/80 leading-relaxed">
						Hopefully they will never see this. Even if they see, they will get
						to know their potential or get some small ideas.
					</p>
				</div>

				<div className="mt-10">
					{/* Slide caption + controls sit just above the overlapping search bar */}
					<div className="flex translate-y-3 items-end justify-between text-white">
						<div className="flex items-center gap-2">
							<StarIcon className="text-saffron-300" height={15} width={15} />
							<span className="font-medium text-sm text-white/90">
								{active.name}
								<span className="text-white/60"> · {active.tag}</span>
							</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex gap-1.5">
								{HERO_SLIDES.map((slide, i) => (
									<button
										aria-label={`Show ${slide.name}`}
										className={`h-1.5 rounded-full transition-all ${
											i === index
												? "w-6 bg-white"
												: "w-1.5 bg-white/40 hover:bg-white/70"
										}`}
										key={slide.name}
										onClick={() => setIndex(i)}
										type="button"
									/>
								))}
							</div>
							<div className="flex gap-1.5">
								<button
									aria-label="Previous"
									className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20"
									onClick={() =>
										setIndex(
											(index - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
										)
									}
									type="button"
								>
									<ArrowRightIcon
										className="rotate-180"
										height={15}
										width={15}
									/>
								</button>
								<button
									aria-label="Next"
									className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/25 transition hover:bg-white/20"
									onClick={() => setIndex((index + 1) % HERO_SLIDES.length)}
									type="button"
								>
									<ArrowRightIcon height={15} width={15} />
								</button>
							</div>
						</div>
					</div>
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
				<Card className="rounded-3xl p-6" jali>
					<CardTitle className="text-xl">Popular routes</CardTitle>
					<div className="mt-4 grid gap-3 sm:grid-cols-2">
						{POPULAR_ROUTES.map((route) => (
							<Link
								className="group flex items-center justify-between rounded-2xl border border-ink-100 bg-canvas px-4 py-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-saffron-300 hover:bg-saffron-50 hover:shadow-card motion-reduce:hover:translate-y-0"
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
										className="text-ink-400 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-saffron-500"
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
				</Card>

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
		<section className="cv-auto border-ink-100 border-y bg-surface-2">
			<div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
				<h2 className="text-center font-bold font-display text-2xl text-ink-900 tracking-tight sm:text-3xl">
					GSRTC growing numbers
				</h2>
				<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{GROWING_NUMBERS.map((item) => (
						<Card className="p-5" jali key={item.label}>
							<span className="gradient-text inline-flex">
								<item.icon height={26} width={26} />
							</span>
							<p className="mt-3 font-display font-extrabold text-2xl text-ink-900">
								{item.value}
							</p>
							<p className="mt-0.5 text-ink-500 text-sm">{item.label}</p>
						</Card>
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
		<section className="cv-auto mx-auto max-w-6xl px-4 py-14 sm:px-6">
			<div className="flex items-center gap-3">
				<span className="gradient-text">
					<TrackIcon height={26} width={26} />
				</span>
				<h2 className="font-bold font-display text-2xl text-ink-900 tracking-tight sm:text-3xl">
					GSRTC live tracking
				</h2>
			</div>
			<Link
				className="group gradient-surface mt-6 flex items-center justify-between rounded-2xl border border-transparent p-5 text-white shadow-card transition hover:brightness-105"
				to="/track"
			>
				<span className="flex items-center gap-3">
					<span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
						<TrackIcon height={22} width={22} />
					</span>
					<span>
						<span className="block font-semibold">Track a bus on the web</span>
						<span className="block text-sm text-white/80">
							See stop-by-stop progress — no app needed
						</span>
					</span>
				</span>
				<ArrowRightIcon
					className="transition group-hover:translate-x-1"
					height={18}
					width={18}
				/>
			</Link>
			<div className="mt-4 grid gap-4 sm:grid-cols-2">
				{cards.map((card) => (
					<a
						className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-ink-100 bg-surface p-5 shadow-card transition hover:border-saffron-300"
						href="/"
						key={card.sub}
					>
						<span
							aria-hidden
							className="jali-card pointer-events-none absolute inset-0"
						/>
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
		<section className="cv-auto mx-auto max-w-6xl px-4 pb-14 sm:px-6">
			<h2 className="font-bold font-display text-2xl text-ink-900 tracking-tight sm:text-3xl">
				Top destinations
			</h2>
			<p className="mt-2 max-w-2xl text-ink-500">
				Popular pilgrimage spots, tourist cities and key commercial hubs — GSRTC
				connects you to every corner of Gujarat through its extensive network.
			</p>
			<div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{DESTINATIONS.map((place) => (
					<Card
						className="group transition hover:-translate-y-0.5 hover:shadow-pop"
						jali
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
					</Card>
				))}
			</div>
		</section>
	);
}
