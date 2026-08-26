import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Passenger } from "#/api/schemas";

// ── Identity (Better Auth) ───────────────────────────────────────────────
// Generated from Better Auth 1.7.1 with the phone-number plugin. Better Auth
// owns all identity and session state; passenger-facing mobile fields remain
// deliberately independent so people can book without an account.
export const user = pgTable("user", {
	createdAt: timestamp("created_at").defaultNow().notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	id: text("id").primaryKey(),
	image: text("image"),
	name: text("name").notNull(),
	phoneNumber: text("phone_number").unique(),
	phoneNumberVerified: boolean("phone_number_verified"),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		createdAt: timestamp("created_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		id: text("id").primaryKey(),
		ipAddress: text("ip_address"),
		token: text("token").notNull().unique(),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => new Date())
			.notNull(),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
	"account",
	{
		accessToken: text("access_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		accountId: text("account_id").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		id: text("id").primaryKey(),
		idToken: text("id_token"),
		issuer: text("issuer").notNull(),
		password: text("password"),
		providerId: text("provider_id").notNull(),
		refreshToken: text("refresh_token"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		updatedAt: timestamp("updated_at")
			.$onUpdate(() => new Date())
			.notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [
		uniqueIndex("account_issuer_accountId_uidx").on(
			table.issuer,
			table.accountId
		),
		index("account_userId_idx").on(table.userId),
	]
);

export const verification = pgTable(
	"verification",
	{
		createdAt: timestamp("created_at").defaultNow().notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		value: text("value").notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)]
);

// ── Content configuration ───────────────────────────────────────────────
// Transactional page forms are editable content. Their fields stay JSONB so a
// page author can add, reorder, or relabel controls without a schema migration.
export interface StoredPageFormField {
	full?: boolean;
	label: string;
	name: string;
	options?: string[];
	placeholder?: string;
	type?: "text" | "tel" | "email" | "date" | "password" | "select" | "textarea";
}

export const pageForms = pgTable("page_forms", {
	external: text("external"),
	fields: jsonb("fields").$type<StoredPageFormField[]>().notNull(),
	intro: text("intro").notNull(),
	note: text("note"),
	slug: text("slug").primaryKey(),
	submit: text("submit").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, { fields: [account.userId], references: [user.id] }),
}));

// ── Bookings ─────────────────────────────────────────────────────────────
// Trips themselves stay synthetic (generated from the search leg, mirroring
// how the real adapter would read OPRS's live timetable. Only the seats
// that have actually been touched by a hold or booking are persisted, as an
// overlay on top of the deterministic baseline occupancy in router.ts.
export const seatHolds = pgTable("seat_holds", {
	consumedAt: timestamp("consumed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	id: text("id").primaryKey(),
	seatNos: jsonb("seat_nos").$type<string[]>().notNull(),
	tripId: text("trip_id").notNull(),
});

export const bookedSeats = pgTable(
	"booked_seats",
	{
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		holdId: text("hold_id"),
		id: text("id").primaryKey(),
		pnr: text("pnr"),
		seatNo: text("seat_no").notNull(),
		state: text("state", { enum: ["held", "booked"] }).notNull(),
		tripId: text("trip_id").notNull(),
	},
	(table) => [
		uniqueIndex("booked_seats_active_trip_seat_unique")
			.on(table.tripId, table.seatNo)
			.where(sql`${table.state} IN ('held', 'booked')`),
		index("booked_seats_trip_idx").on(table.tripId),
		index("booked_seats_pnr_idx").on(table.pnr),
	]
);

export const bookings = pgTable(
	"bookings",
	{
		amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).notNull(),
		contactEmail: text("contact_email"),
		contactMobile: text("contact_mobile").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		from: text("from").notNull(),
		journeyDate: text("journey_date").notNull(),
		passengers: jsonb("passengers").$type<Passenger[]>().notNull(),
		pnr: text("pnr").primaryKey(),
		seatNos: jsonb("seat_nos").$type<string[]>().notNull(),
		singleLady: boolean("single_lady").notNull().default(false),
		status: text("status", {
			enum: ["confirmed", "waiting", "cancelled", "completed"],
		})
			.notNull()
			.default("confirmed"),
		to: text("to").notNull(),
		tripId: text("trip_id").notNull(),
	},
	(table) => [index("bookings_mobile_idx").on(table.contactMobile)]
);

// ── Wallet ───────────────────────────────────────────────────────────────
export const walletAccounts = pgTable("wallet_accounts", {
	balance: numeric("balance", { precision: 10, scale: 2 })
		.notNull()
		.default("0"),
	kycStatus: text("kyc_status", { enum: ["verified", "pending", "none"] })
		.notNull()
		.default("none"),
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id),
});

export const walletTransactions = pgTable(
	"wallet_transactions",
	{
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		description: text("description").notNull(),
		id: text("id").primaryKey(),
		type: text("type", { enum: ["credit", "debit"] }).notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id),
	},
	(table) => [index("wallet_transactions_user_idx").on(table.userId)]
);

// ── Payments ─────────────────────────────────────────────────────────────
// An intent is written before redirecting to Dodo. It retains the data a
// webhook needs to fulfil an account-free booking without a browser session.
export const paymentIntents = pgTable(
	"payment_intents",
	{
		amountPaise: integer("amount_paise").notNull(),
		checkoutUrl: text("checkout_url"),
		contactEmail: text("contact_email"),
		contactMobile: text("contact_mobile"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		currency: text("currency").notNull().default("INR"),
		dodoPaymentId: text("dodo_payment_id"),
		dodoSessionId: text("dodo_session_id"),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		failureCode: text("failure_code"),
		failureMessage: text("failure_message"),
		holdId: text("hold_id"),
		id: text("id").primaryKey(),
		incidentReason: text("incident_reason"),
		lastWebhookAt: timestamp("last_webhook_at", { withTimezone: true }),
		lastWebhookId: text("last_webhook_id"),
		passengers: jsonb("passengers").$type<Passenger[]>(),
		pnr: text("pnr"),
		purpose: text("purpose", { enum: ["booking", "wallet_topup"] }).notNull(),
		refundId: text("refund_id"),
		singleLady: boolean("single_lady"),
		status: text("status", {
			enum: [
				"created",
				"processing",
				"succeeded",
				"failed",
				"orphaned",
				"expired",
				"refunded",
			],
		}).notNull(),
		tripId: text("trip_id"),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		userId: text("user_id").references(() => user.id),
	},
	(table) => [
		index("payment_intents_hold_id_idx").on(table.holdId),
		index("payment_intents_user_id_idx").on(table.userId),
		index("payment_intents_dodo_payment_id_idx").on(table.dodoPaymentId),
		index("payment_intents_status_idx").on(table.status),
		index("payment_intents_incident_idx")
			.on(table.createdAt)
			.where(sql`${table.incidentReason} IS NOT NULL`),
	]
);

export const paymentWebhookEvents = pgTable("payment_webhook_events", {
	eventType: text("event_type").notNull(),
	payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
	paymentIntentId: text("payment_intent_id"),
	processedAt: timestamp("processed_at", { withTimezone: true }),
	processingError: text("processing_error"),
	receivedAt: timestamp("received_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	webhookId: text("webhook_id").primaryKey(),
});

// ── Agents ───────────────────────────────────────────────────────────────
// Agent identity stays separate from Better Auth users: an agent application
// can exist before approval, while Better Auth remains the only session store.
export const agents = pgTable(
	"agents",
	{
		agentCode: text("agent_code").primaryKey(),
		allottedRoutes: jsonb("allotted_routes").$type<string[]>().notNull(),
		allottedSeats: integer("allotted_seats").notNull().default(0),
		applicationNo: text("application_no").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		division: text("division").notNull(),
		email: text("email").notNull(),
		mobile: text("mobile").notNull(),
		name: text("name").notNull(),
		pan: text("pan").notNull(),
		status: text("status", { enum: ["applied", "active", "rejected"] })
			.notNull()
			.default("applied"),
	},
	(table) => [
		index("agents_application_no_idx").on(table.applicationNo),
		index("agents_mobile_idx").on(table.mobile),
	]
);

export const agentETopTransactions = pgTable(
	"agent_etop_transactions",
	{
		agentCode: text("agent_code")
			.notNull()
			.references(() => agents.agentCode),
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		status: text("status", {
			enum: ["success", "pending", "failed"],
		}).notNull(),
		transactionId: text("transaction_id").primaryKey(),
	},
	(table) => [
		index("agent_etop_transactions_agent_code_idx").on(table.agentCode),
	]
);

// ── Passes ───────────────────────────────────────────────────────────────
export const passes = pgTable(
	"passes",
	{
		applicationNo: text("application_no").primaryKey(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		from: text("from").notNull(),
		issueLocation: text("issue_location").notNull(),
		mobile: text("mobile").notNull(),
		name: text("name").notNull(),
		renewedFrom: text("renewed_from"),
		status: text("status", { enum: ["applied", "issued", "expired"] })
			.notNull()
			.default("applied"),
		to: text("to").notNull(),
		type: text("type", {
			enum: ["Daily", "Monthly", "Quarterly", "Student"],
		}).notNull(),
		validFrom: text("valid_from").notNull(),
		validTo: text("valid_to").notNull(),
	},
	(table) => [index("passes_mobile_idx").on(table.mobile)]
);

// ── Refunds ──────────────────────────────────────────────────────────────
// A refund row is created automatically when a ticket is cancelled; a
// complaint is a separate follow-up record a passenger can raise against it.
export const refunds = pgTable(
	"refunds",
	{
		amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expectedBy: text("expected_by"),
		mobile: text("mobile").notNull(),
		ref: text("ref").primaryKey(),
		status: text("status", {
			enum: ["initiated", "processing", "credited", "failed"],
		})
			.notNull()
			.default("initiated"),
		ticketNo: text("ticket_no").notNull(),
	},
	(table) => [index("refunds_mobile_idx").on(table.mobile)]
);

export const refundComplaints = pgTable("refund_complaints", {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	email: text("email").notNull(),
	id: text("id").primaryKey(),
	message: text("message").notNull(),
	mobile: text("mobile").notNull(),
	status: text("status", { enum: ["open", "in_review", "resolved"] })
		.notNull()
		.default("open"),
	ticketNo: text("ticket_no").notNull(),
});
