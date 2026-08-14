// Config-driven designed forms for the transactional GSRTC pages (concept UI —
// not wired to a backend). One template renders them all from this data.

export interface FormField {
	full?: boolean;
	label: string;
	name: string;
	options?: readonly string[];
	placeholder?: string;
	type?: "text" | "tel" | "email" | "date" | "password" | "select" | "textarea";
}

export interface PageForm {
	// When set, the primary button links out to the official portal instead of
	// pretending to submit.
	external?: string;
	fields: readonly FormField[];
	intro: string;
	note?: string;
	submit: string;
}

const PASS_TYPES = ["Daily", "Monthly", "Quarterly", "Student"] as const;
const DIVISIONS = [
	"Ahmedabad",
	"Vadodara",
	"Surat",
	"Rajkot",
	"Bhavnagar",
	"Mehsana",
	"Other",
] as const;

export const PAGE_FORMS: Record<string, PageForm> = {
	"agent-allotment": {
		fields: [
			{ label: "Agent code", name: "code" },
			{ label: "Password", name: "password", type: "password" },
		],
		intro: "View seat and route allotment for a registered agent.",
		submit: "View allotment",
	},
	"cancel-ticket": {
		fields: [
			{
				label: "Ticket number",
				name: "ticket",
				placeholder: "e.g. 24051234567",
			},
			{
				label: "Registered mobile",
				name: "mobile",
				placeholder: "10-digit number",
				type: "tel",
			},
		],
		intro:
			"Cancel a confirmed GSRTC ticket. Cancellation charges apply based on how far from departure you cancel; the balance is refunded to the original payment method.",
		note: "Refunds are processed within 7–10 working days.",
		submit: "Find ticket to cancel",
	},
	"e-top-status": {
		fields: [
			{ label: "Transaction ID", name: "txn", placeholder: "e.g. ETOP123456" },
		],
		intro: "Check the status of an agent e-top-up (wallet recharge) request.",
		submit: "Check e-top status",
	},
	"gsrtc-agent-login": {
		external: "https://www.gsrtc.in/OPRSWeb/preUserAuthenticate.do",
		fields: [
			{ label: "Agent ID / username", name: "user" },
			{ label: "Password", name: "password", type: "password" },
		],
		intro: "Portal login for GSRTC booking agents.",
		submit: "Open agent portal",
	},
	"new-agent-register": {
		fields: [
			{ label: "Full name", name: "name" },
			{ label: "Mobile", name: "mobile", type: "tel" },
			{ label: "Email", name: "email", type: "email" },
			{
				label: "Preferred division",
				name: "division",
				options: DIVISIONS,
				type: "select",
			},
			{ label: "PAN", name: "pan" },
		],
		intro:
			"Apply to become an authorised GSRTC booking agent. We review applications and respond by email.",
		note: "Registration is subject to GSRTC's franchisee terms & conditions.",
		submit: "Submit application",
	},
	"new-commuter-bus-pass": {
		fields: [
			{ label: "Full name", name: "name" },
			{ label: "Mobile", name: "mobile", type: "tel" },
			{ label: "From (boarding point)", name: "from" },
			{ label: "To (destination)", name: "to" },
			{ label: "Pass type", name: "type", options: PASS_TYPES, type: "select" },
		],
		intro:
			"Apply for a new monthly commuter bus pass online. Bring the reference number and a photo ID to any bus station to collect the pass.",
		submit: "Apply for pass",
	},
	"print-sms-ticket": {
		fields: [
			{
				label: "Ticket number",
				name: "ticket",
				placeholder: "e.g. 24051234567",
			},
			{
				label: "Registered mobile",
				name: "mobile",
				placeholder: "10-digit number",
				type: "tel",
			},
		],
		intro: "Reprint your e-ticket or resend it to your phone by SMS.",
		submit: "Retrieve ticket",
	},
	"refund-complaint": {
		fields: [
			{
				label: "Ticket number",
				name: "ticket",
				placeholder: "e.g. 24051234567",
			},
			{
				label: "Registered mobile",
				name: "mobile",
				placeholder: "10-digit number",
				type: "tel",
			},
			{
				label: "Email",
				name: "email",
				placeholder: "you@example.com",
				type: "email",
			},
			{
				full: true,
				label: "Describe the issue",
				name: "details",
				type: "textarea",
			},
		],
		intro:
			"Raise a complaint for a refund that has not been credited. Our team responds within 3 working days.",
		submit: "Submit complaint",
	},
	"refund-transaction-enquiry": {
		fields: [
			{
				label: "Transaction / ticket number",
				name: "txn",
				placeholder: "e.g. TXN123456",
			},
			{
				label: "Registered mobile",
				name: "mobile",
				placeholder: "10-digit number",
				type: "tel",
			},
		],
		intro:
			"Track the status of a refund or a payment that did not complete against your booking.",
		submit: "Check refund status",
	},
	"reschedule-my-journey": {
		fields: [
			{
				label: "Ticket number",
				name: "ticket",
				placeholder: "e.g. 24051234567",
			},
			{
				label: "Registered mobile",
				name: "mobile",
				placeholder: "10-digit number",
				type: "tel",
			},
			{ label: "New date of journey", name: "date", type: "date" },
		],
		intro:
			"Move an existing booking to a different date or service. Rescheduling is allowed once, up to a set time before departure.",
		note: "A fare difference may apply for the new service.",
		submit: "Find booking",
	},
	"sharvan-tirth-darshan": {
		external: "https://yatradham.gujarat.gov.in/Booking",
		fields: [
			{ label: "From", name: "from" },
			{ label: "Travel date", name: "date", type: "date" },
		],
		intro:
			"Special pilgrimage bus services connecting Gujarat's revered temples under the Sharvan Tirth Darshan scheme.",
		submit: "Check yatra services",
	},
	"unity-booking": {
		external: "https://www.soutickets.in/#/gsrtc-booking",
		fields: [
			{ label: "From", name: "from" },
			{ label: "Date of visit", name: "date", type: "date" },
			{
				label: "Visitors",
				name: "visitors",
				options: ["1", "2", "3", "4", "5", "6"],
				type: "select",
			},
		],
		intro:
			"Book GSRTC buses to the Statue of Unity at Kevadia and its attractions.",
		submit: "Continue to Unity booking",
	},
	"view-history": {
		fields: [
			{
				label: "Registered mobile",
				name: "mobile",
				placeholder: "10-digit number",
				type: "tel",
			},
			{ label: "Password / OTP", name: "password", type: "password" },
		],
		intro: "View your past bookings, cancellations and transactions.",
		submit: "View history",
	},
	"waiting-list-ticket-status": {
		fields: [
			{
				label: "Ticket / PNR number",
				name: "ticket",
				placeholder: "e.g. 24051234567",
			},
		],
		intro: "Check whether a waiting-list ticket has moved to confirmed.",
		submit: "Check status",
	},
};
