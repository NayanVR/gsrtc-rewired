/** Lightweight inline icon set (stroke-based, currentColor). */
import type { ReactElement, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
	return {
		"aria-hidden": true,
		fill: "none",
		height: 20,
		stroke: "currentColor",
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
		strokeWidth: 1.8,
		viewBox: "0 0 24 24",
		width: 20,
		...props,
	};
}

export function BusIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
			<path d="M4 11h16" />
			<path d="M4 17h16" />
			<path d="M7 17v2M17 17v2" />
			<circle cx="8" cy="14" fill="currentColor" r="0.6" />
			<circle cx="16" cy="14" fill="currentColor" r="0.6" />
		</svg>
	);
}

export function SwapIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M7 4 4 7l3 3" />
			<path d="M4 7h16" />
			<path d="m17 20 3-3-3-3" />
			<path d="M20 17H4" />
		</svg>
	);
}

export function PinIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z" />
			<circle cx="12" cy="10" r="2.5" />
		</svg>
	);
}

export function CalendarIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<rect height="16" rx="2" width="18" x="3" y="5" />
			<path d="M3 9h18M8 3v4M16 3v4" />
		</svg>
	);
}

export function UsersIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<circle cx="9" cy="8" r="3" />
			<path d="M4 20a5 5 0 0 1 10 0" />
			<path d="M16 6a3 3 0 0 1 0 6M20 20a5 5 0 0 0-4-4.9" />
		</svg>
	);
}

export function ClockIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</svg>
	);
}

export function StarIcon(props: IconProps) {
	return (
		<svg {...base(props)} fill="currentColor" stroke="none">
			<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.3l5.9-.9L12 3Z" />
		</svg>
	);
}

export function ArrowRightIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M5 12h14M13 6l6 6-6 6" />
		</svg>
	);
}

export function CheckIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="m5 12 5 5 9-11" />
		</svg>
	);
}

export function WifiIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0" />
			<circle cx="12" cy="19" fill="currentColor" r="0.6" />
		</svg>
	);
}

export function PlugIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M9 3v5M15 3v5" />
			<path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" />
			<path d="M12 17v4" />
		</svg>
	);
}

export function DropIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M12 3s6 6.3 6 10a6 6 0 0 1-12 0c0-3.7 6-10 6-10Z" />
		</svg>
	);
}

export function BlanketIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<rect height="14" rx="2" width="16" x="4" y="5" />
			<path d="M8 5v14M8 9h12M8 13h12" />
		</svg>
	);
}

export function BulbIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M9 18h6M10 21h4" />
			<path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.3 1 2.5h6c0-1.2.3-1.8 1-2.5A6 6 0 0 0 12 3Z" />
		</svg>
	);
}

export function ShieldIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M12 3 5 6v5c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6l-7-3Z" />
			<path d="m9 12 2 2 4-4" />
		</svg>
	);
}

export function MenuIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M4 7h16M4 12h16M4 17h16" />
		</svg>
	);
}

export function PhoneIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M4 5c0 8 7 15 15 15l1-3.5-4-1.5-1.5 2a11 11 0 0 1-4.5-4.5l2-1.5L10.5 6 7 5H4Z" />
		</svg>
	);
}

export function ShieldCheckIcon(props: IconProps) {
	return ShieldIcon(props);
}

export function MailIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<rect height="14" rx="2" width="18" x="3" y="5" />
			<path d="m3 7 9 6 9-6" />
		</svg>
	);
}

export function GlobeIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<circle cx="12" cy="12" r="9" />
			<path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
		</svg>
	);
}

export function ChevronDownIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="m6 9 6 6 6-6" />
		</svg>
	);
}

export function BellIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
			<path d="M10 20a2 2 0 0 0 4 0" />
		</svg>
	);
}

export function AccessibilityIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<circle cx="12" cy="4.5" r="1.6" />
			<path d="M5 8h14M12 8v5m0 0 3.5 6M12 13l-3.5 6" />
		</svg>
	);
}

export function UserIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<circle cx="12" cy="8" r="3.5" />
			<path d="M5 20a7 7 0 0 1 14 0" />
		</svg>
	);
}

export function AndroidIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M6 10a6 6 0 0 1 12 0v6H6z" />
			<path d="M6 16v2M18 16v2M8 4l1.5 2M16 4l-1.5 2" />
			<circle cx="9.5" cy="10.5" fill="currentColor" r="0.6" />
			<circle cx="14.5" cy="10.5" fill="currentColor" r="0.6" />
		</svg>
	);
}

export function AppleIcon(props: IconProps) {
	return (
		<svg {...base(props)} fill="currentColor" stroke="none">
			<path d="M16 12.5c0-2 1.5-3 1.6-3.1-.9-1.3-2.3-1.5-2.8-1.5-1.2-.1-2.3.7-2.9.7s-1.5-.7-2.5-.7c-1.3 0-2.5.8-3.1 1.9-1.4 2.3-.4 5.8 1 7.7.7.9 1.4 2 2.5 1.9 1-.04 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-.9 2.4-1.8c.5-.7.8-1.4 1-1.6-.02-.02-1.7-.7-1.7-2.6Z" />
			<path d="M13.8 6.4c.6-.7 1-1.6.9-2.5-.8 0-1.8.5-2.4 1.2-.5.6-1 1.5-.8 2.4.9.06 1.8-.4 2.3-1.1Z" />
		</svg>
	);
}

export function WalletIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<rect height="13" rx="2.5" width="18" x="3" y="6" />
			<path d="M3 10h18M16 14h2" />
		</svg>
	);
}

export function UsersGroupIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<circle cx="8" cy="9" r="2.6" />
			<circle cx="16" cy="9" r="2.6" />
			<path d="M3 19a5 5 0 0 1 10 0M13.5 15a5 5 0 0 1 7.5 4" />
		</svg>
	);
}

export function TrackIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11Z" />
			<circle cx="12" cy="10" r="2.5" />
			<path d="M12 10v0" />
		</svg>
	);
}

export function TicketIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
			<path d="M14 6v12" strokeDasharray="2 2" />
		</svg>
	);
}

export function QrIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<rect height="6" rx="1" width="6" x="4" y="4" />
			<rect height="6" rx="1" width="6" x="4" y="14" />
			<rect height="6" rx="1" width="6" x="14" y="4" />
			<path d="M14 14h3v3M20 14v6M14 20h3" />
		</svg>
	);
}

export function DiscountIcon(props: IconProps) {
	return (
		<svg {...base(props)}>
			<path d="M9 3H5a2 2 0 0 0-2 2v4l10 10 6-6L9 3Z" />
			<circle cx="7.5" cy="7.5" r="1.2" />
		</svg>
	);
}

export const AMENITY_ICONS: Record<string, (p: IconProps) => ReactElement> = {
	blanket: BlanketIcon,
	bulb: BulbIcon,
	drop: DropIcon,
	plug: PlugIcon,
	shield: ShieldIcon,
	wifi: WifiIcon,
};
