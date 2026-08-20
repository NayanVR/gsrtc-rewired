CREATE TABLE "booked_seats" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"hold_id" text,
	"id" text PRIMARY KEY NOT NULL,
	"pnr" text,
	"seat_no" text NOT NULL,
	"state" text NOT NULL,
	"trip_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"amount_paid" numeric(10, 2) NOT NULL,
	"contact_email" text,
	"contact_mobile" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from" text NOT NULL,
	"journey_date" text NOT NULL,
	"passengers" jsonb NOT NULL,
	"pnr" text PRIMARY KEY NOT NULL,
	"seat_nos" jsonb NOT NULL,
	"single_lady" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"to" text NOT NULL,
	"trip_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"attempts" integer DEFAULT 0 NOT NULL,
	"code_hash" text NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"mobile" text NOT NULL,
	"request_id" text NOT NULL,
	CONSTRAINT "otp_codes_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "passes" (
	"application_no" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"from" text NOT NULL,
	"issue_location" text NOT NULL,
	"mobile" text NOT NULL,
	"name" text NOT NULL,
	"renewed_from" text,
	"status" text DEFAULT 'applied' NOT NULL,
	"to" text NOT NULL,
	"type" text NOT NULL,
	"valid_from" text NOT NULL,
	"valid_to" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refund_complaints" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"mobile" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"ticket_no" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_by" text,
	"mobile" text NOT NULL,
	"ref" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'initiated' NOT NULL,
	"ticket_no" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seat_holds" (
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"seat_nos" jsonb NOT NULL,
	"trip_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text,
	"id" text PRIMARY KEY NOT NULL,
	"mobile" text NOT NULL,
	"name" text DEFAULT 'Guest' NOT NULL,
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"balance" numeric(10, 2) DEFAULT '0' NOT NULL,
	"kyc_status" text DEFAULT 'none' NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booked_seats_trip_idx" ON "booked_seats" USING btree ("trip_id");--> statement-breakpoint
CREATE INDEX "booked_seats_pnr_idx" ON "booked_seats" USING btree ("pnr");--> statement-breakpoint
CREATE INDEX "bookings_mobile_idx" ON "bookings" USING btree ("contact_mobile");--> statement-breakpoint
CREATE INDEX "otp_codes_mobile_idx" ON "otp_codes" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "passes_mobile_idx" ON "passes" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "refunds_mobile_idx" ON "refunds" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "wallet_transactions_user_idx" ON "wallet_transactions" USING btree ("user_id");