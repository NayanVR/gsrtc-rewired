import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
	"inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold text-xs",
	{
		defaultVariants: { tone: "neutral" },
		variants: {
			tone: {
				brand: "bg-brand-50 text-brand-700",
				danger: "bg-danger-50 text-danger-700",
				neutral: "bg-muted text-muted-foreground",
				saffron: "bg-saffron-50 text-saffron-700",
				success: "bg-success-50 text-success-foreground",
			},
		},
	}
);

export function Badge({
	className,
	tone,
	...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
	return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
