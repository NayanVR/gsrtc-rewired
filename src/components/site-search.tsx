import { useNavigate } from "@tanstack/react-router";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { SearchIcon } from "#/components/icons";
import { PAGE_BLURBS, PAGE_TITLES } from "#/data/site-nav";

// One flat index of everything you can jump to: the top-level features plus
// every informational / transactional page. Keyed navigation stays type-safe
// via the discriminated `kind`.
type SearchItem = {
	group: string;
	keywords?: string;
	label: string;
} & (
	| { kind: "route"; to: "/" | "/search" | "/track" }
	| { kind: "page"; slug: string }
);

const FEATURE_ITEMS: SearchItem[] = [
	{
		group: "Quick actions",
		keywords: "search trips book fare route seats",
		kind: "route",
		label: "Book bus tickets",
		to: "/search",
	},
	{
		group: "Quick actions",
		keywords: "live where progress vehicle service number",
		kind: "route",
		label: "Track your bus",
		to: "/track",
	},
	{
		group: "Quick actions",
		keywords: "home landing",
		kind: "route",
		label: "Home",
		to: "/",
	},
];

const PAGE_ITEMS: SearchItem[] = Object.entries(PAGE_TITLES).map(
	([slug, label]) => ({
		group: "Pages",
		keywords: PAGE_BLURBS[slug] ?? "",
		kind: "page",
		label,
		slug,
	})
);

const ALL_ITEMS = [...FEATURE_ITEMS, ...PAGE_ITEMS];
const MAX_RESULTS = 8;

function filterItems(query: string): SearchItem[] {
	const q = query.trim().toLowerCase();
	if (!q) {
		return [
			...FEATURE_ITEMS,
			...PAGE_ITEMS.slice(0, MAX_RESULTS - FEATURE_ITEMS.length),
		];
	}
	return ALL_ITEMS.filter(
		(item) =>
			item.label.toLowerCase().includes(q) ||
			item.keywords?.toLowerCase().includes(q)
	).slice(0, MAX_RESULTS);
}

export function SiteSearch() {
	const navigate = useNavigate();
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [query, setQuery] = useState("");
	const [active, setActive] = useState(0);
	const results = filterItems(query);

	const open = () => {
		setQuery("");
		setActive(0);
		dialogRef.current?.showModal();
	};

	useEffect(() => {
		const onKey = (event: globalThis.KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setQuery("");
				setActive(0);
				dialogRef.current?.showModal();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const go = (item: SearchItem) => {
		dialogRef.current?.close();
		if (item.kind === "page") {
			navigate({ params: { slug: item.slug }, to: "/p/$slug" });
		} else {
			navigate({ to: item.to });
		}
	};

	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			setActive((a) => Math.min(a + 1, results.length - 1));
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (event.key === "Enter") {
			event.preventDefault();
			const item = results[active];
			if (item) {
				go(item);
			}
		}
	};

	return (
		<>
			<button
				aria-keyshortcuts="Meta+K Control+K"
				aria-label="Search the site"
				className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pr-2 pl-3 text-ink-500 text-sm transition hover:border-saffron-300 hover:text-ink-700"
				onClick={open}
				type="button"
			>
				<SearchIcon height={16} width={16} />
				<span className="hidden sm:inline">Search…</span>
				<kbd className="hidden rounded border border-ink-200 bg-canvas px-1.5 font-sans text-[10px] text-ink-400 sm:inline">
					⌘K
				</kbd>
			</button>

			<dialog
				aria-label="Site search"
				className="mt-[12vh] mr-auto ml-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-surface p-0 shadow-pop backdrop:bg-ink-900/40"
				data-no-translate
				onClose={() => setQuery("")}
				ref={dialogRef}
			>
				<div className="flex items-center gap-3 border-ink-100 border-b px-4 py-3">
					<SearchIcon className="text-ink-400" height={18} width={18} />
					<input
						className="flex-1 bg-transparent text-ink-900 outline-none placeholder:text-ink-400"
						onChange={(event) => {
							setQuery(event.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						placeholder="Search pages and actions…"
						value={query}
					/>
					<kbd className="rounded border border-ink-200 px-1.5 py-0.5 text-[10px] text-ink-400">
						Esc
					</kbd>
				</div>

				{results.length === 0 ? (
					<p className="px-4 py-8 text-center text-ink-500 text-sm">
						No matches for “{query}”.
					</p>
				) : (
					<ul className="max-h-[50vh] overflow-y-auto p-2">
						{results.map((item, index) => (
							<li key={item.kind === "page" ? item.slug : item.to}>
								<button
									className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
										index === active
											? "bg-saffron-50 text-saffron-800"
											: "text-ink-700 hover:bg-canvas"
									}`}
									onClick={() => go(item)}
									onMouseEnter={() => setActive(index)}
									type="button"
								>
									<span className="font-medium">{item.label}</span>
									<span className="text-ink-400 text-xs">{item.group}</span>
								</button>
							</li>
						))}
					</ul>
				)}
			</dialog>
		</>
	);
}
