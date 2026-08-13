import { useEffect, useId, useState } from "react";
import {
	AkshardhamArt,
	DwarkaArt,
	RannOfKutchArt,
	SomnathArt,
	StatueOfUnityArt,
} from "#/components/artwork";

const SLIDES = [
	{
		Art: StatueOfUnityArt,
		name: "Statue of Unity",
		note: "The world's tallest statue",
		tag: "Kevadia",
	},
	{
		Art: AkshardhamArt,
		name: "Akshardham",
		note: "Swaminarayan temple architecture",
		tag: "Gandhinagar",
	},
	{
		Art: RannOfKutchArt,
		name: "Rann of Kutch",
		note: "The white salt desert",
		tag: "Dhordo",
	},
	{
		Art: SomnathArt,
		name: "Somnath",
		note: "First of the Jyotirlinga shrines",
		tag: "Gir Somnath",
	},
	{
		Art: DwarkaArt,
		name: "Dwarka",
		note: "Coastal pilgrimage city",
		tag: "Devbhumi Dwarka",
	},
] as const;

const ROTATE_MS = 4500;

export function HeroSlideshow() {
	const [index, setIndex] = useState(0);
	const [paused, setPaused] = useState(false);
	const labelId = useId();

	useEffect(() => {
		if (paused) {
			return;
		}
		const id = setInterval(
			() => setIndex((value) => (value + 1) % SLIDES.length),
			ROTATE_MS
		);
		return () => clearInterval(id);
	}, [paused]);

	const go = (next: number) => setIndex((next + SLIDES.length) % SLIDES.length);

	return (
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: hover only pauses auto-rotation; arrows and dots remain keyboard-accessible
		<section
			aria-label="Explore Gujarat"
			aria-roledescription="carousel"
			className="relative overflow-hidden rounded-3xl border border-white/15 shadow-pop"
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			<div className="relative aspect-[16/11] w-full">
				{SLIDES.map((slide, i) => {
					const active = i === index;
					return (
						<div
							aria-hidden={!active}
							className="absolute inset-0 transition-opacity duration-700"
							id={`${labelId}-${i}`}
							key={slide.name}
							style={{ opacity: active ? 1 : 0 }}
						>
							<slide.Art className="h-full w-full" />
							<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5 pt-10">
								<p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 font-medium text-white text-xs ring-1 ring-white/25 backdrop-blur">
									{slide.tag}
								</p>
								<h3 className="mt-2 font-bold font-display text-2xl text-white">
									{slide.name}
								</h3>
								<p className="text-sm text-white/80">{slide.note}</p>
							</div>
						</div>
					);
				})}

				{/* Arrows */}
				<button
					aria-label="Previous slide"
					className="absolute top-1/2 left-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-black/50"
					onClick={() => go(index - 1)}
					type="button"
				>
					<Chevron dir="left" />
				</button>
				<button
					aria-label="Next slide"
					className="absolute top-1/2 right-3 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-black/50"
					onClick={() => go(index + 1)}
					type="button"
				>
					<Chevron dir="right" />
				</button>
			</div>

			{/* Dots */}
			<div className="absolute top-3 right-3 flex gap-1.5">
				{SLIDES.map((slide, i) => (
					<button
						aria-current={i === index}
						aria-label={`Go to ${slide.name}`}
						className={`h-1.5 rounded-full transition-all ${
							i === index
								? "w-6 bg-white"
								: "w-1.5 bg-white/50 hover:bg-white/80"
						}`}
						key={slide.name}
						onClick={() => setIndex(i)}
						type="button"
					/>
				))}
			</div>
		</section>
	);
}

function Chevron({ dir }: { dir: "left" | "right" }) {
	return (
		<svg
			aria-hidden
			fill="none"
			height={18}
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			viewBox="0 0 24 24"
			width={18}
		>
			{dir === "left" ? <path d="m15 6-6 6 6 6" /> : <path d="m9 6 6 6-6 6" />}
		</svg>
	);
}
