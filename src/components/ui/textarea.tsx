import { CONTROL_CLASS } from "#/components/ui/control";
import { cn } from "#/lib/cn";

export function Textarea({
	className,
	rows = 4,
	...props
}: React.ComponentProps<"textarea">) {
	return (
		<textarea className={cn(CONTROL_CLASS, className)} rows={rows} {...props} />
	);
}
