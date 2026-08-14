// Single source of truth for header nav, footer links and stub-page titles.
// Labels drive everything; routes are derived via slugify so there are no
// duplicated slug strings to keep in sync.

export const slugify = (label: string): string =>
	label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

export interface NavGroup {
	// Leaf items (no children) are direct links; groups open a dropdown.
	children?: readonly string[];
	label: string;
}

export const NAV: readonly NavGroup[] = [
	{
		children: [
			"Reschedule My Journey",
			"Refund Complaint",
			"Refund / Transaction Enquiry",
			"View History",
			"Print / SMS Ticket",
			"Cancel Ticket",
			"Waiting List Ticket Status",
			"Wallet Passbook",
			"Wallet Account",
		],
		label: "Online Users",
	},
	{
		children: [
			"GSRTC / Agent Login",
			"New Agent Register",
			"Agent Allotment",
			"E-Top Status",
		],
		label: "GSRTC / Agent Login",
	},
	{ label: "Sharvan Tirth Darshan" },
	{ children: ["New Commuter Bus Pass", "FAQs"], label: "Bus Pass" },
	{ label: "Unity Booking" },
] as const;

export const FOOTER_COLUMNS = [
	{
		heading: "Corporation",
		links: [
			"About Us",
			"Leadership",
			"Special Services",
			"Achievements",
			"Tenders",
			"FAQs",
			"Sitemap",
		],
	},
	{
		heading: "Policies & Governance",
		links: [
			"Booking Policies",
			"Proactive Disclosure (RTI)",
			"RTC Act",
			"Divisions",
			"Corporate Office",
			"Performance",
			"Bus Enquiry",
		],
	},
	{
		heading: "Public Information",
		links: [
			"Recruitment",
			"Contact Us",
			"Awards",
			"GSRTC Direct Agents List",
			"GSRTC Franchisee Agents List",
			"Blacklisted Agencies",
			"Grievance Redressal Officers (Divyang)",
			"Annual Audit Report",
		],
	},
	{
		heading: "Resources",
		links: [
			"Gujarat Pavitra Yatradham Vikas Board",
			"Download",
			"Privacy Policy",
			"India Code",
			"Press Release",
			"Citizen's Rights (નાગરિક અધિકાર પત્ર)",
			"Women Harassment Act 2013 (Circular 323)",
			"Service Regulation",
		],
	},
] as const;

// Short intent lines for the key functional pages; everything else falls back
// to a generic placeholder in the page shell.
export const PAGE_BLURBS: Record<string, string> = {
	"agent-allotment": "View seat and route allotment for registered agents.",
	"cancel-ticket": "Cancel a confirmed GSRTC ticket and start the refund.",
	"e-top-status": "Check the status of an agent e-top-up request.",
	faqs: "Answers to common questions about booking, refunds and passes.",
	"gsrtc-agent-login": "Portal login for GSRTC booking agents.",
	"new-agent-register": "Apply to become an authorised GSRTC booking agent.",
	"new-commuter-bus-pass": "Apply for a new monthly commuter bus pass online.",
	"print-sms-ticket": "Reprint your ticket or resend it to your phone by SMS.",
	"refund-complaint":
		"Raise a complaint for a refund that has not been credited.",
	"refund-transaction-enquiry":
		"Check the status of a refund or a failed transaction against your booking.",
	"reschedule-my-journey":
		"Change the travel date or service on an existing GSRTC ticket before departure.",
	"sharvan-tirth-darshan":
		"Special pilgrimage bus services connecting Gujarat's revered temples.",
	"unity-booking":
		"Book tickets to the Statue of Unity at Kevadia and its attractions.",
	"view-history": "See your past bookings, cancellations and transactions.",
	"waiting-list-ticket-status":
		"Track the confirmation status of a waiting-list ticket.",
	"wallet-account":
		"Manage your GSRTC wallet, top up balance and view details.",
	"wallet-passbook":
		"Review credits, debits and the running balance of your GSRTC wallet.",
};

// Flat slug -> title map covering every routable stub page.
const leafLabels = [
	...NAV.flatMap((group) => group.children ?? [group.label]),
	...FOOTER_COLUMNS.flatMap((column) => column.links),
];

export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
	leafLabels.map((label) => [slugify(label), label])
);
