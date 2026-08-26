import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS } from "./control";

export function Textarea({
	className,
	rows = 4,
	...props
}: ComponentProps<"textarea">) {
	return (
		<textarea className={cn(CONTROL_CLASS, className)} rows={rows} {...props} />
	);
}
