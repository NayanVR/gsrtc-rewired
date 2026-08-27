import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { SpinnerIcon } from "#/components/icons";
import { cn } from "#/lib/cn";

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
	extends React.ComponentProps<"button">,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	loading?: boolean;
}

// Reusable button with variants, sizes and a built-in press micro-interaction.
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
	const Component = asChild ? Slot : "button";
	const isDisabled = disabled || loading;
	return (
		<Component
			aria-busy={loading || undefined}
			className={cn(buttonVariants({ size, variant }), className)}
			disabled={asChild ? undefined : isDisabled}
			type={asChild ? undefined : type}
			{...props}
		>
			{loading ? <SpinnerIcon className="size-4" /> : null}
			{children}
		</Component>
	);
}

export { buttonVariants };
