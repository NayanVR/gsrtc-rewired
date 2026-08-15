import { cn } from "#/lib/cn";

const VARIANTS = {
	ghost: "text-ink-700 hover:bg-saffron-50 hover:text-saffron-700",
	primary: "gradient-surface text-white shadow-sm hover:brightness-105",
	secondary: "border border-ink-200 bg-surface text-ink-700 hover:bg-canvas",
} as const;

const SIZES = {
	lg: "px-6 py-3",
	md: "px-5 py-2.5",
	sm: "px-4 py-2 text-sm",
} as const;

export interface ButtonProps extends React.ComponentProps<"button"> {
	size?: keyof typeof SIZES;
	variant?: keyof typeof VARIANTS;
}

// Reusable button with variants, sizes and a built-in press micro-interaction.
export function Button({
	variant = "primary",
	size = "md",
	className,
	type = "button",
	...props
}: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,filter,background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300/60 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
				VARIANTS[variant],
				SIZES[size],
				className
			)}
			type={type}
			{...props}
		/>
	);
}
