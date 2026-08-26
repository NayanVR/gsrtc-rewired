import type { LabelHTMLAttributes } from "react";
import { cn } from "#/lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
	htmlFor: string;
}

export function Label({ children, className, htmlFor, ...props }: LabelProps) {
	return (
		<label
			className={cn("font-medium text-ink-600 text-sm", className)}
			htmlFor={htmlFor}
			{...props}
		>
			{children}
		</label>
	);
}
