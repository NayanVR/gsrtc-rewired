import type { SVGProps } from "react";

export function SpinnerIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
	return (
		<svg
			aria-hidden="true"
			className={`animate-spin motion-reduce:animate-none ${className ?? ""}`}
			fill="none"
			height="20"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.8"
			viewBox="0 0 24 24"
			width="20"
			{...props}
		>
			<circle cx="12" cy="12" opacity="0.25" r="8" />
			<path d="M20 12a8 8 0 0 0-8-8" />
		</svg>
	);
}
