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

// Proper nouns the phonetic engine gets wrong: acronyms it would spell out, and
// place names that have an established native spelling (e.g. Ahmedabad is
// અમદાવાદ, not the phonetic અહમદાબાદ). Keyed by lowercased word.
const OVERRIDES: Record<string, Record<Exclude<Lang, "en">, string>> = {
	ahmedabad: { gu: "અમદાવાદ", hi: "अहमदाबाद" },
	anand: { gu: "આણંદ", hi: "आणंद" },
	bharuch: { gu: "ભરૂચ", hi: "भरूच" },
	bhavnagar: { gu: "ભાવનગર", hi: "भावनगर" },
	bhuj: { gu: "ભુજ", hi: "भुज" },
	gandhinagar: { gu: "ગાંધીનગર", hi: "गांधीनगर" },
	gsrtc: { gu: "GSRTC", hi: "GSRTC" },
	gujarat: { gu: "ગુજરાત", hi: "गुजरात" },
	jamnagar: { gu: "જામનગર", hi: "जामनगर" },
	junagadh: { gu: "જૂનાગઢ", hi: "जूनागढ़" },
	mehsana: { gu: "મહેસાણા", hi: "महेसाणा" },
	nadiad: { gu: "નડિયાદ", hi: "नडियाद" },
	navsari: { gu: "નવસારી", hi: "नवसारी" },
	palanpur: { gu: "પાલનપુર", hi: "पालनपुर" },
	porbandar: { gu: "પોરબંદર", hi: "पोरबंदर" },
	rajkot: { gu: "રાજકોટ", hi: "राजकोट" },
	surat: { gu: "સુરત", hi: "सूरत" },
	vadodara: { gu: "વડોદરા", hi: "वडोदरा" },
	valsad: { gu: "વલસાડ", hi: "वलसाड" },
};

const cache = new Map<string, string>();
const originals = new WeakMap<Text, string>();
const HAS_LATIN = /[A-Za-z]/;
const WORD_RE = /[A-Za-z]+/g;

// Transliterate one word (lowercased) via the API, cached. Overridden proper
// nouns never hit the network.
async function ensureWord(lower: string, lang: Exclude<Lang, "en">) {
	if (OVERRIDES[lower]) {
		return;
	}
	const key = `${lang}:${lower}`;
	if (cache.has(key)) {
		return;
	}
	try {
		const url = `https://inputtools.google.com/request?itc=${ITC[lang]}&num=1&cp=0&cs=0&ie=utf-8&oe=utf-8&text=${encodeURIComponent(lower)}`;
		const res = await fetch(url);
		const data = await res.json();
		cache.set(
			key,
			data?.[0] === "SUCCESS" ? (data[1]?.[0]?.[1]?.[0] ?? lower) : lower
		);
	} catch {
		cache.set(key, lower);
	}
}

function resolveWord(word: string, lang: Exclude<Lang, "en">): string {
	const lower = word.toLowerCase();
	return OVERRIDES[lower]?.[lang] ?? cache.get(`${lang}:${lower}`) ?? word;
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
		return { node, orig };
	});
	const words = new Set<string>();
	for (const { orig } of items) {
		for (const match of orig.matchAll(WORD_RE)) {
			words.add(match[0].toLowerCase());
		}
	}
	await Promise.all([...words].map((word) => ensureWord(word, lang)));
	if (isCancelled()) {
		return;
	}
	for (const { node, orig } of items) {
		if (HAS_LATIN.test(orig)) {
			node.textContent = orig.replace(WORD_RE, (word) =>
				resolveWord(word, lang)
			);
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
