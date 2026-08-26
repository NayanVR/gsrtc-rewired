/**
 * Mandala/lotus brand mark with concentric geometry inspired by Sarvam's
 * mandala construction, filled with the signature blue→orange spectrum.
 */
interface BrandMarkProps {
	className?: string;
	size?: number;
}

const PETALS = Array.from({ length: 12 }, (_, index) => index * 30);

export function BrandMark({ size = 44, className }: BrandMarkProps) {
	return (
		<svg
			aria-hidden
			className={className}
			height={size}
			role="img"
			viewBox="0 0 64 64"
			width={size}
		>
			<defs>
				<linearGradient id="brandGrad" x1="0" x2="1" y1="0" y2="1">
					<stop offset="0%" stopColor="#2340cf" />
					<stop offset="45%" stopColor="#a5459f" />
					<stop offset="75%" stopColor="#f2651f" />
					<stop offset="100%" stopColor="#ffab2e" />
				</linearGradient>
			</defs>
			<circle cx="32" cy="32" fill="url(#brandGrad)" r="31" />
			<g
				fill="none"
				opacity="0.9"
				stroke="#fffdf9"
				strokeLinecap="round"
				strokeWidth="1.4"
			>
				{PETALS.map((angle) => (
					<ellipse
						cx="32"
						cy="18"
						key={angle}
						rx="5.5"
						ry="12"
						transform={`rotate(${angle} 32 32)`}
					/>
				))}
				<circle cx="32" cy="32" r="7.5" strokeWidth="1.8" />
			</g>
		</svg>
	);
}
