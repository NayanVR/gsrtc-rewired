import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS } from "./control";

export function Select({
	className,
	children,
	...props
}: ComponentProps<"select">) {
	return (
		<select
			className={cn(CONTROL_CLASS, "cursor-pointer", className)}
			{...props}
		>
			{children}
		</select>
	);
}
