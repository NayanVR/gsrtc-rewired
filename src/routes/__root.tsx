import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource/hind-vadodara/400.css";
import "@fontsource/hind-vadodara/gujarati-400.css";
import "@fontsource/hind-vadodara/600.css";
import "@fontsource/hind-vadodara/gujarati-600.css";
import "@fontsource/hind-vadodara/700.css";
import "@fontsource/hind-vadodara/gujarati-700.css";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ErrorPanel } from "#/components/error-panel";
import { toAppError } from "#/lib/error-copy";

import { LanguageProvider } from "#/lib/i18n";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	errorComponent: RootError,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "GSRTC · Book Gujarat State Road Transport bus tickets" },
			{
				name: "description",
				content:
					"Search, compare and book GSRTC bus tickets across Gujarat. A cleaner, faster and more accessible booking experience.",
			},
			{ name: "theme-color", content: "#1a49e6" },
		],
		links: [
			{ rel: "icon", href: "/favicon.ico", sizes: "any" },
			{ rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
			{
				rel: "icon",
				href: "/favicon-32x32.png",
				type: "image/png",
				sizes: "32x32",
			},
			{
				rel: "icon",
				href: "/favicon-16x16.png",
				type: "image/png",
				sizes: "16x16",
			},
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
			{ rel: "stylesheet", href: appCss },
		],
	}),
	notFoundComponent: RootNotFound,
	shellComponent: RootDocument,
});

function RootError({ error }: { error: unknown }) {
	return (
		<main className="mx-auto min-h-[60vh] max-w-xl px-4 py-16" id="main">
			<ErrorPanel error={toAppError(error)} />
			<Link
				className="mt-5 inline-block font-semibold text-brand-700 hover:underline"
				to="/"
			>
				Back to home
			</Link>
		</main>
	);
}

function RootNotFound() {
	return (
		<main className="mx-auto min-h-[60vh] max-w-xl px-4 py-16" id="main">
			<h1 className="font-bold font-display text-2xl text-ink-900">
				Page not found
			</h1>
			<p className="mt-2 text-ink-600">
				The page you requested is not available.
			</p>
			<Link
				className="mt-5 inline-block font-semibold text-brand-700 hover:underline"
				to="/"
			>
				Back to home
			</Link>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<a
					className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-brand-700 focus:px-4 focus:py-2 focus:text-white"
					href="#main"
				>
					Skip to main content
				</a>
				<LanguageProvider>{children}</LanguageProvider>
				{import.meta.env.DEV ? (
					<TanStackDevtools
						config={{ position: "bottom-right" }}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				) : null}
				<Scripts />
			</body>
		</html>
	);
}
