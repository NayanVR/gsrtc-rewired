import { CONTROL_CLASS } from "#/components/ui/control";
import { cn } from "#/lib/cn";

export function Select({
	className,
	children,
	...props
}: React.ComponentProps<"select">) {
	return (
		<select
			className={cn(CONTROL_CLASS, "cursor-pointer", className)}
			{...props}
		>
			{children}
		</select>
	);
}
