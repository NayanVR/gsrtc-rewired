import { useId } from "react";
import { cn } from "#/lib/cn";

interface FieldProps {
	// Receives the generated id so the control can be associated with the label.
	children: (id: string) => React.ReactNode;
	className?: string;
	description?: string;
	label: string;
}

// Labelled form field wrapper: label above, control below, optional hint.
export function Field({ label, description, className, children }: FieldProps) {
	const id = useId();
	return (
		<div className={cn("block", className)}>
			<label
				className="mb-1.5 block font-medium text-ink-600 text-sm"
				htmlFor={id}
			>
				{label}
			</label>
			{children(id)}
			{description ? (
				<p className="mt-1 text-ink-400 text-xs">{description}</p>
			) : null}
		</div>
	);
}
