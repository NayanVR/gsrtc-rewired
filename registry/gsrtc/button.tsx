import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { SpinnerIcon } from "./spinner-icon";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,filter,background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100",
	{
		defaultVariants: { size: "md", variant: "primary" },
		variants: {
			size: {
				icon: "size-10 p-0",
				lg: "px-6 py-3",
				md: "px-5 py-2.5",
				sm: "px-4 py-2 text-sm",
			},
			variant: {
				destructive:
					"bg-destructive text-destructive-foreground hover:brightness-105",
				ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
				link: "text-brand-700 underline-offset-4 hover:underline",
				primary:
					"gradient-surface text-primary-foreground shadow-sm hover:brightness-105",
				secondary:
					"border border-input bg-card text-secondary-foreground hover:bg-background",
			},
		},
	}
);

export interface ButtonProps
	extends ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	loading?: boolean;
}

export function Button({
	variant = "primary",
	size = "md",
	className,
	type = "button",
	asChild = false,
	loading = false,
	children,
	disabled,
	...props
}: ButtonProps) {
	const isDisabled = disabled || loading;
	const classes = cn(buttonVariants({ size, variant }), className);

	if (asChild) {
		return (
			<Slot aria-busy={loading || undefined} className={classes} {...props}>
				{loading ? <SpinnerIcon className="size-4" /> : null}
				<Slottable>{children}</Slottable>
			</Slot>
		);
	}

	return (
		<button
			aria-busy={loading || undefined}
			className={classes}
			disabled={isDisabled}
			type={type}
			{...props}
		>
			{loading ? <SpinnerIcon className="size-4" /> : null}
			{children}
		</button>
	);
}

export { buttonVariants };
