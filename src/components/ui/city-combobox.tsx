import { useId, useMemo, useState } from "react";
import { PinIcon } from "#/components/icons";
import {
	SEARCH_CONTROL_CLASS,
	SearchField,
} from "#/components/ui/search-field";

const MAX_SUGGESTIONS = 6;

interface CityComboboxProps {
	cities: string[];
	error?: boolean;
	id: string;
	label: string;
	onChange: (value: string) => void;
	placeholder: string;
	value: string;
}

export function CityCombobox({
	cities,
	error = false,
	id,
	label,
	onChange,
	placeholder,
	value,
}: CityComboboxProps) {
	const listId = useId();
	const [open, setOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
	const suggestions = useMemo(() => {
		const query = value.trim().toLocaleLowerCase();
		return cities
			.filter((city) => city.toLocaleLowerCase().includes(query))
			.slice(0, MAX_SUGGESTIONS);
	}, [cities, value]);
	const hasSuggestions = open && suggestions.length > 0;

	const selectCity = (city: string) => {
		onChange(city);
		setActiveIndex(-1);
		setOpen(false);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setOpen(true);
			setActiveIndex((current) =>
				Math.min(current + 1, suggestions.length - 1)
			);
			return;
		}
		if (event.key === "ArrowUp") {
			event.preventDefault();
			setActiveIndex((current) => Math.max(current - 1, 0));
			return;
		}
		if (event.key === "Escape") {
			setOpen(false);
			setActiveIndex(-1);
			return;
		}
		if (event.key === "Enter" && activeIndex >= 0) {
			event.preventDefault();
			const city = suggestions[activeIndex];
			if (city) {
				selectCity(city);
			}
		}
	};

	return (
		<SearchField
			className="relative z-20 focus-within:z-30 focus-within:border-saffron-400 focus-within:bg-surface focus-within:shadow-[0_0_0_3px_rgb(242_101_24_/_0.10)] aria-invalid:border-destructive aria-invalid:focus-within:border-destructive aria-invalid:focus-within:shadow-[0_0_0_3px_rgb(216_76_18_/_0.12)]"
			icon={<PinIcon />}
			id={id}
			invalid={error}
			label={label}
		>
			<input
				aria-activedescendant={
					activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
				}
				aria-autocomplete="list"
				aria-controls={hasSuggestions ? listId : undefined}
				aria-expanded={hasSuggestions}
				aria-invalid={error || undefined}
				autoComplete="off"
				className={`${SEARCH_CONTROL_CLASS} appearance-none`}
				id={id}
				onBlur={() => {
					setOpen(false);
					setActiveIndex(-1);
				}}
				onChange={(event) => {
					onChange(event.target.value);
					setActiveIndex(-1);
					setOpen(true);
				}}
				onFocus={() => setOpen(true)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				role="combobox"
				value={value}
			/>
			{hasSuggestions ? (
				<div
					className="absolute top-[calc(100%+0.55rem)] right-0 left-0 overflow-hidden rounded-xl border border-ink-200 bg-surface p-1 shadow-pop"
					id={listId}
					role="listbox"
					tabIndex={-1}
				>
					{suggestions.map((city, index) => {
						const active = index === activeIndex;
						return (
							<button
								aria-selected={active}
								className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left font-medium text-sm transition-colors ${
									active
										? "bg-saffron-50 text-saffron-800"
										: "text-ink-700 hover:bg-canvas"
								}`}
								id={`${listId}-${index}`}
								key={city}
								onMouseDown={(event) => {
									event.preventDefault();
									selectCity(city);
								}}
								role="option"
								type="button"
							>
								<PinIcon className="text-saffron-500" height={14} width={14} />
								{city}
							</button>
						);
					})}
				</div>
			) : null}
		</SearchField>
	);
}
