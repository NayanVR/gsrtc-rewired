import { cn } from "#/lib/cn";

// Base class for the borderless control that sits inside a SearchField.
// `appearance-none` on the text/datalist inputs removes the native combobox
// focus ring that otherwise overlaps the floating label.
export const SEARCH_CONTROL_CLASS =
	"w-full bg-transparent font-semibold text-ink-900 outline-none placeholder:text-ink-400 focus:outline-none";

interface SearchFieldProps {
	children: React.ReactNode;
	className?: string;
	icon: React.ReactNode;
	id: string;
	invalid?: boolean;
	label: string;
}

// The pill-shaped hero search field: icon + floating label + control, with a
// single clean focus indication (border only, no ring).
export function SearchField({
	icon,
	label,
	id,
	invalid = false,
	children,
	className,
}: SearchFieldProps) {
	return (
		<div
			aria-invalid={invalid || undefined}
			className={cn(
				"search-field flex items-center gap-3 rounded-xl border border-ink-200 bg-surface px-3.5 py-2.5 transition-colors focus-within:border-saffron-400",
				className
			)}
		>
			<span className="shrink-0 text-saffron-500">{icon}</span>
			<label className="min-w-0 flex-1" htmlFor={id}>
				<span className="block font-medium text-ink-500 text-xs">{label}</span>
				{children}
			</label>
		</div>
	);
}
