import { CONTROL_CLASS } from "#/components/ui/control";
import { cn } from "#/lib/cn";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
	return <input className={cn(CONTROL_CLASS, className)} {...props} />;
}
