/**
 * Recreated GSRTC poster/artwork as self-contained vector art.
 * Landmark scenes are drawn as layered silhouettes so they read well over
 * the dithered signature gradient. The QR encodes https://feedback.gsrtc.org.
 */

/** Real, scannable QR (25×25 modules) for the feedback portal. */
const QR_PATH =
	"M0 0.5h7m2 0h1m1 0h2m3 0h1m1 0h7M0 1.5h1m5 0h1m2 0h1m2 0h4m2 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h1m1 0h2m1 0h2m3 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m1 0h5m1 0h1m3 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m1 0h2m1 0h1m1 0h1m1 0h2m1 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h1m1 0h1m1 0h1m1 0h1M0 8.5h1m1 0h5m2 0h1m2 0h3m3 0h5M0 9.5h1m1 0h2m10 0h1m1 0h1m2 0h1m3 0h1M0 10.5h2m1 0h2m1 0h1m1 0h2m1 0h1m1 0h1m1 0h4m1 0h2m1 0h2M0 11.5h2m1 0h1m5 0h2m6 0h3m4 0h1M3 12.5h1m1 0h2m1 0h1m3 0h4m1 0h2m1 0h1m1 0h3M0 13.5h1m1 0h2m1 0h1m1 0h1m2 0h1m1 0h1m1 0h1m1 0h1m2 0h1m1 0h1m1 0h1M0 14.5h1m1 0h1m2 0h2m2 0h2m3 0h8m1 0h2M0 15.5h1m6 0h2m2 0h1m3 0h1m1 0h4m3 0h1M0 16.5h1m2 0h2m1 0h1m3 0h1m1 0h9m1 0h1M8 17.5h1m1 0h2m3 0h2m3 0h2M0 18.5h7m2 0h2m1 0h2m2 0h1m1 0h1m1 0h1m1 0h3M0 19.5h1m5 0h1m1 0h1m2 0h2m1 0h1m1 0h1m3 0h2M0 20.5h1m1 0h3m1 0h1m1 0h1m1 0h1m2 0h1m1 0h6m1 0h1M0 21.5h1m1 0h3m1 0h1m1 0h1m2 0h1m1 0h1m1 0h4m1 0h5M0 22.5h1m1 0h3m1 0h1m1 0h2m3 0h3m5 0h2m1 0h1M0 23.5h1m5 0h1m2 0h3m3 0h7m2 0h1M0 24.5h7m1 0h1m2 0h4m3 0h7";

export function QrCode({ size = 96 }: { size?: number }) {
	return (
		<svg
			height={size}
			role="img"
			shapeRendering="crispEdges"
			viewBox="0 0 25 25"
			width={size}
		>
			<title>QR code to feedback.gsrtc.org</title>
			<rect fill="#fffdf9" height="25" width="25" x="0" y="0" />
			<path d={QR_PATH} stroke="#1a1712" />
		</svg>
	);
}

interface SceneProps {
	className?: string;
}

function SceneFrame({
	from,
	to,
	className,
	children,
}: {
	from: string;
	to: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={`relative overflow-hidden ${className ?? ""}`}
			style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
		>
			<div aria-hidden className="grain" />
			<svg
				aria-hidden
				className="absolute inset-0 h-full w-full"
				preserveAspectRatio="xMidYMax meet"
				viewBox="0 0 160 120"
			>
				{children}
			</svg>
		</div>
	);
}

export function StatueOfUnityArt({ className }: SceneProps) {
	return (
		<SceneFrame className={className} from="#2a52c9" to="#0f2a7a">
			<circle cx="128" cy="26" fill="#ffd9a8" opacity="0.85" r="12" />
			{/* river band */}
			<path d="M0 104h160v16H0z" fill="#0c2470" opacity="0.6" />
			{/* pedestal */}
			<rect fill="#0c2470" height="14" width="40" x="60" y="92" />
			<rect fill="#12328f" height="10" width="28" x="66" y="84" />
			{/* statue silhouette */}
			<path
				d="M80 20c4 0 6 3 6 7 0 3-2 5-2 8l4 16-3 2 2 20 3 18h-20l3-18 2-20-3-2 4-16c0-3-2-5-2-8 0-4 2-7 6-7Z"
				fill="#0b205f"
			/>
			<path d="M74 60l-8 6 2 4 8-6z" fill="#0b205f" />
			<path d="M86 60l8 6-2 4-8-6z" fill="#0b205f" />
		</SceneFrame>
	);
}

export function SomnathArt({ className }: SceneProps) {
	return (
		<SceneFrame className={className} from="#f2731c" to="#b5307a">
			<circle cx="30" cy="30" fill="#ffe1b0" opacity="0.9" r="14" />
			<path d="M0 106h160v14H0z" fill="#7a1f57" opacity="0.65" />
			{/* temple */}
			<g fill="#5e1746">
				<rect height="24" width="56" x="52" y="82" />
				<path d="M60 82l20-46 20 46z" />
				<path d="M80 30l4 8h-8z" />
				<rect height="10" width="8" x="76" y="20" />
				<rect fill="#4c1038" height="36" width="10" x="66" y="70" />
				<rect fill="#4c1038" height="36" width="10" x="84" y="70" />
			</g>
			<rect fill="#37102b" height="20" width="12" x="74" y="86" />
		</SceneFrame>
	);
}

export function RannOfKutchArt({ className }: SceneProps) {
	return (
		<SceneFrame className={className} from="#c0489a" to="#5e2aa8">
			<circle cx="120" cy="34" fill="#ffe6c2" opacity="0.9" r="16" />
			{/* salt flats */}
			<path d="M0 96h160v24H0z" fill="#f3e9f6" opacity="0.85" />
			<path d="M0 96h160v6H0z" fill="#ffffff" opacity="0.5" />
			{/* bhungas (round huts) */}
			<g fill="#4a2185">
				<path d="M36 96V84a10 10 0 0 1 20 0v12z" />
				<path d="M32 84l14-10 14 10z" />
				<path d="M96 96V86a8 8 0 0 1 16 0v10z" />
				<path d="M92 86l12-8 12 8z" />
			</g>
		</SceneFrame>
	);
}

export function DwarkaArt({ className }: SceneProps) {
	return (
		<SceneFrame className={className} from="#2f7de0" to="#123a86">
			<circle cx="34" cy="30" fill="#fff0d0" opacity="0.85" r="13" />
			<path d="M0 104h160v16H0z" fill="#0f2f6e" opacity="0.6" />
			<g fill="#0e2c66">
				<rect height="26" width="44" x="58" y="80" />
				<path d="M64 80l16-40 16 40z" />
				{/* flag */}
				<rect fill="#ffd27a" height="14" width="2" x="79" y="18" />
				<path d="M81 18l12 5-12 5z" fill="#ffb43a" />
				<rect fill="#0a2352" height="36" width="8" x="70" y="70" />
				<rect fill="#0a2352" height="36" width="8" x="82" y="70" />
			</g>
		</SceneFrame>
	);
}

/** A friendly GSRTC bus for the feedback poster. */
export function BusArt({ className }: SceneProps) {
	return (
		<svg aria-hidden className={className} fill="none" viewBox="0 0 120 72">
			<rect fill="#fffdf9" height="6" rx="3" width="118" x="1" y="60" />
			<g>
				<rect fill="#ffffff" height="40" rx="7" width="100" x="12" y="18" />
				<rect
					fill="url(#busband)"
					height="10"
					rx="2"
					width="100"
					x="12"
					y="40"
				/>
				<rect fill="#dbe6ff" height="14" rx="2" width="16" x="18" y="24" />
				<rect fill="#dbe6ff" height="14" rx="2" width="16" x="38" y="24" />
				<rect fill="#dbe6ff" height="14" rx="2" width="16" x="58" y="24" />
				<rect fill="#dbe6ff" height="14" rx="2" width="16" x="78" y="24" />
				<rect fill="#0f2f6e" height="24" rx="2" width="8" x="100" y="24" />
				<circle cx="34" cy="60" fill="#1a1712" r="8" />
				<circle cx="34" cy="60" fill="#c4b9a6" r="3" />
				<circle cx="92" cy="60" fill="#1a1712" r="8" />
				<circle cx="92" cy="60" fill="#c4b9a6" r="3" />
			</g>
			<defs>
				<linearGradient id="busband" x1="0" x2="1" y1="0" y2="0">
					<stop offset="0" stopColor="#2340cf" />
					<stop offset="0.6" stopColor="#b5459b" />
					<stop offset="1" stopColor="#f2651f" />
				</linearGradient>
			</defs>
		</svg>
	);
}

/** Trophy motif for the milestone poster. */
export function TrophyArt({ className }: SceneProps) {
	return (
		<svg aria-hidden className={className} fill="none" viewBox="0 0 48 48">
			<path d="M14 8h20v8a10 10 0 0 1-20 0z" fill="url(#trophyg)" />
			<path
				d="M14 10H9a4 4 0 0 0 5 8M34 10h5a4 4 0 0 1-5 8"
				stroke="url(#trophyg)"
				strokeWidth="2.4"
			/>
			<rect fill="url(#trophyg)" height="6" rx="1" width="6" x="21" y="26" />
			<rect fill="url(#trophyg)" height="3" rx="1.5" width="16" x="16" y="32" />
			<rect fill="url(#trophyg)" height="3" rx="1.5" width="22" x="13" y="36" />
			<defs>
				<linearGradient id="trophyg" x1="0" x2="1" y1="0" y2="1">
					<stop offset="0" stopColor="#f2651f" />
					<stop offset="1" stopColor="#ffab2e" />
				</linearGradient>
			</defs>
		</svg>
	);
}
