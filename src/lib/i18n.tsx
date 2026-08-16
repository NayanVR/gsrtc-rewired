import { useRouterState } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

export type Lang = "en" | "gu" | "hi";

export const LANGUAGES: { code: Lang; label: string }[] = [
	{ code: "en", label: "English" },
	{ code: "gu", label: "ગુજરાતી" },
	{ code: "hi", label: "हिन्दी" },
];

const STORAGE_KEY = "gsrtc-lang";

// ── Transliteration ───────────────────────────────────────────────────────
// Phonetic Latin → Gujarati/Hindi via Google Input Tools (free, no key). We
// transliterate rendered text in place; a missing/failed response falls back to
// English, so the toggle degrades gracefully offline.
// ponytail: naive DOM-walk transliteration re-run per navigation; swap for a
// proper i18n dictionary if real translation (not phonetic) is needed.
const ITC: Record<Exclude<Lang, "en">, string> = {
	gu: "gu-t-i0-und",
	hi: "hi-t-i0-und",
};
const cache = new Map<string, string>();
const originals = new WeakMap<Text, string>();
const HAS_LATIN = /[A-Za-z]/;

async function convert(
	trimmed: string,
	lang: Exclude<Lang, "en">
): Promise<string> {
	const key = `${lang}:${trimmed}`;
	const hit = cache.get(key);
	if (hit !== undefined) {
		return hit;
	}
	try {
		const url = `https://inputtools.google.com/request?itc=${ITC[lang]}&num=1&cp=0&cs=0&ie=utf-8&oe=utf-8&text=${encodeURIComponent(trimmed)}`;
		const res = await fetch(url);
		const data = await res.json();
		const out =
			data?.[0] === "SUCCESS" ? (data[1]?.[0]?.[1]?.[0] ?? trimmed) : trimmed;
		cache.set(key, out);
		return out;
	} catch {
		cache.set(key, trimmed);
		return trimmed;
	}
}

function collectTextNodes(): Text[] {
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	const nodes: Text[] = [];
	while (walker.nextNode()) {
		const node = walker.currentNode as Text;
		const text = node.textContent;
		const parent = node.parentElement;
		if (!(text?.trim() && parent)) {
			continue;
		}
		if (
			parent.tagName === "SCRIPT" ||
			parent.tagName === "STYLE" ||
			parent.closest("[data-no-translate]")
		) {
			continue;
		}
		nodes.push(node);
	}
	return nodes;
}

async function applyLanguage(lang: Lang, isCancelled: () => boolean) {
	const nodes = collectTextNodes();

	if (lang === "en") {
		for (const node of nodes) {
			const orig = originals.get(node);
			if (orig !== undefined) {
				node.textContent = orig;
			}
		}
		return;
	}

	const items = nodes.map((node) => {
		const orig = originals.get(node) ?? node.textContent ?? "";
		originals.set(node, orig);
		return { node, orig, trimmed: orig.trim() };
	});
	const unique = [
		...new Set(
			items.filter((i) => HAS_LATIN.test(i.trimmed)).map((i) => i.trimmed)
		),
	];
	await Promise.all(unique.map((t) => convert(t, lang)));
	if (isCancelled()) {
		return;
	}
	for (const { node, orig, trimmed } of items) {
		if (!HAS_LATIN.test(trimmed)) {
			continue;
		}
		const conv = cache.get(`${lang}:${trimmed}`);
		if (conv) {
			node.textContent = orig.replace(trimmed, conv);
		}
	}
}

// ── Context ───────────────────────────────────────────────────────────────
const LanguageContext = createContext<{
	lang: Lang;
	setLang: (lang: Lang) => void;
}>({ lang: "en", setLang: () => undefined });

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [lang, setLangState] = useState<Lang>("en");
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
		if (saved && saved !== "en") {
			document.documentElement.lang = saved;
			setLangState(saved);
		}
	}, []);

	const setLang = (next: Lang) => {
		localStorage.setItem(STORAGE_KEY, next);
		document.documentElement.lang = next;
		setLangState(next);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname re-triggers the walk after each client navigation
	useEffect(() => {
		let cancelled = false;
		// Let the just-navigated page paint before walking its text.
		const id = window.setTimeout(() => applyLanguage(lang, () => cancelled), 0);
		return () => {
			cancelled = true;
			window.clearTimeout(id);
		};
	}, [lang, pathname]);

	return (
		<LanguageContext.Provider value={{ lang, setLang }}>
			{children}
		</LanguageContext.Provider>
	);
}
