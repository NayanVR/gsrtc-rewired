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

// ── Translation ───────────────────────────────────────────────────────────
// Real EN → Gujarati/Hindi translation via the free Google Translate endpoint
// (no key). Rendered text is translated in place and cached; a failed response
// falls back to English, so the toggle degrades gracefully offline.
// ponytail: client-side DOM-walk translation re-run per navigation; move to a
// build-time message catalogue if this needs to scale or work offline.
const TL: Record<Exclude<Lang, "en">, string> = { gu: "gu", hi: "hi" };
const FETCH_CONCURRENCY = 10;

const cache = new Map<string, string>();
const originals = new WeakMap<Text, string>();
const HAS_LATIN = /[A-Za-z]/;

async function translate(
	text: string,
	lang: Exclude<Lang, "en">
): Promise<void> {
	const key = `${lang}:${text}`;
	if (cache.has(key)) {
		return;
	}
	try {
		const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${TL[lang]}&dt=t&q=${encodeURIComponent(text)}`;
		const res = await fetch(url);
		const data = await res.json();
		const segments: unknown = data?.[0];
		const out = Array.isArray(segments)
			? segments.map((s) => (Array.isArray(s) ? (s[0] ?? "") : "")).join("")
			: "";
		cache.set(key, out || text);
	} catch {
		cache.set(key, text);
	}
}

// Bounded concurrency: the free endpoint rate-limits bursts, so translate in
// small batches rather than firing every phrase at once.
async function translateAll(texts: string[], lang: Exclude<Lang, "en">) {
	for (let i = 0; i < texts.length; i += FETCH_CONCURRENCY) {
		// biome-ignore lint/performance/noAwaitInLoops: sequential batches are the point — they bound concurrency against the rate-limited endpoint
		await Promise.all(
			texts.slice(i, i + FETCH_CONCURRENCY).map((t) => translate(t, lang))
		);
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
	await translateAll(unique, lang);
	if (isCancelled()) {
		return;
	}
	for (const { node, orig, trimmed } of items) {
		if (!HAS_LATIN.test(trimmed)) {
			continue;
		}
		const translated = cache.get(`${lang}:${trimmed}`);
		if (translated) {
			node.textContent = orig.replace(trimmed, translated);
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
