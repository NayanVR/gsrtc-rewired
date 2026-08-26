import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { CONTROL_CLASS } from "./control";

export function Input({ className, ...props }: ComponentProps<"input">) {
	return <input className={cn(CONTROL_CLASS, className)} {...props} />;
}
