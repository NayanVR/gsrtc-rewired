import { type ReactNode, useId } from "react";
import { Label } from "#/components/ui/label";
import { cn } from "#/lib/cn";

export interface FieldControlProps {
	"aria-describedby"?: string;
	"aria-invalid"?: true;
	"aria-required"?: true;
	id: string;
}

interface FieldProps {
	children: (props: FieldControlProps) => ReactNode;
	className?: string;
	description?: string;
	error?: string;
	label: string;
	labelClassName?: string;
	required?: boolean;
}

export function Field({
	label,
	description,
	error,
	required,
	labelClassName,
	className,
	children,
}: FieldProps) {
	const id = useId();
	const descriptionId = `${id}-desc`;
	const errorId = `${id}-error`;
	const message = error ?? description;
	let messageId: string | undefined;
	if (error) {
		messageId = errorId;
	} else if (description) {
		messageId = descriptionId;
	}
	return (
		<div className={cn("block", className)}>
			<Label
				className={cn(
					"mb-1.5 block font-medium text-ink-600 text-sm",
					labelClassName
				)}
				htmlFor={id}
			>
				{label}
				{required ? (
					<span className="text-saffron-600">
						{" "}
						*<span className="sr-only"> (required)</span>
					</span>
				) : null}
			</Label>
			{children({
				"aria-describedby": messageId,
				"aria-invalid": error ? true : undefined,
				"aria-required": required ? true : undefined,
				id,
			})}
			{message ? (
				<p
					className={cn(
						"mt-1 text-xs",
						error ? "text-destructive text-sm" : "text-ink-400"
					)}
					id={messageId}
					role={error ? "alert" : undefined}
				>
					{message}
				</p>
			) : null}
		</div>
	);
}
