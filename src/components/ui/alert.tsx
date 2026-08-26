import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "#/lib/cn";

const alertVariants = cva("rounded-xl border px-4 py-3 text-sm", {
	defaultVariants: { tone: "info" },
	variants: {
		tone: {
			destructive: "border-destructive/30 bg-destructive/10 text-danger-700",
			info: "border-border bg-muted text-foreground",
			success: "border-success/30 bg-success-50 text-success-foreground",
		},
	},
});

export function Alert({
	children,
	className,
	tone,
	...props
}: React.ComponentProps<"section"> &
	VariantProps<typeof alertVariants> & { children: ReactNode }) {
	return (
		<section className={cn(alertVariants({ tone }), className)} {...props}>
			{children}
		</section>
	);
}
