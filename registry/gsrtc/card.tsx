import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const cardVariants = cva(
	"relative overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-card",
	{
		defaultVariants: { tone: "default" },
		variants: {
			tone: {
				canvas: "bg-background",
				default: "bg-card",
				muted: "bg-muted",
			},
		},
	}
);

interface CardProps
	extends HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {
	children: ReactNode;
	jali?: boolean;
}

export function Card({
	children,
	className,
	jali = false,
	tone,
	...props
}: CardProps) {
	return (
		<div className={cn(cardVariants({ tone }), className)} {...props}>
			{jali ? (
				<div
					aria-hidden="true"
					className="jali-card pointer-events-none absolute inset-0"
				/>
			) : null}
			<div className="relative">{children}</div>
		</div>
	);
}

export function CardHeader({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />
	);
}

export function CardTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h3
			className={cn("font-bold font-display text-ink-900", className)}
			{...props}
		/>
	);
}

export function CardContent({
	className,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return <div className={cn("p-5 pt-0", className)} {...props} />;
}
