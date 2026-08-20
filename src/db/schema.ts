import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

// ── Identity ─────────────────────────────────────────────────────────────
// A user row exists once a mobile number has completed OTP verification.
// Most domains (tickets, refunds, passes) are looked up by mobile directly
// and don't require a user row — only wallet is gated behind a real session.
export const users = pgTable("users", {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	email: text("email"),
	id: text("id").primaryKey(),
	mobile: text("mobile").notNull().unique(),
	name: text("name").notNull().default("Guest"),
});

export const otpCodes = pgTable(
	"otp_codes",
	{
		attempts: integer("attempts").notNull().default(0),
		codeHash: text("code_hash").notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		id: text("id").primaryKey(),
		mobile: text("mobile").notNull(),
		requestId: text("request_id").notNull().unique(),
	},
	(table) => [index("otp_codes_mobile_idx").on(table.mobile)]
);

// ── Bookings ─────────────────────────────────────────────────────────────
// Trips themselves stay synthetic (generated from the search leg, mirroring
// how the real adapter would read OPRS's live timetable) — only the seats
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
		passengers: jsonb("passengers")
			.$type<{ name: string; age: number; gender: string; seatNo: string }[]>()
			.notNull(),
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
		.references(() => users.id),
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
			.references(() => users.id),
	},
	(table) => [index("wallet_transactions_user_idx").on(table.userId)]
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
