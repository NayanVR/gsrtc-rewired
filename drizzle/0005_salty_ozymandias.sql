CREATE TABLE "payment_intents" (
	"amount_paise" integer NOT NULL,
	"checkout_url" text,
	"contact_email" text,
	"contact_mobile" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"dodo_payment_id" text,
	"dodo_session_id" text,
	"expires_at" timestamp with time zone NOT NULL,
	"failure_code" text,
	"failure_message" text,
	"hold_id" text,
	"id" text PRIMARY KEY NOT NULL,
	"incident_reason" text,
	"last_webhook_at" timestamp with time zone,
	"last_webhook_id" text,
	"passengers" jsonb,
	"pnr" text,
	"purpose" text NOT NULL,
	"refund_id" text,
	"single_lady" boolean,
	"status" text NOT NULL,
	"trip_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"payment_intent_id" text,
	"processed_at" timestamp with time zone,
	"processing_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"webhook_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_intents_hold_id_idx" ON "payment_intents" USING btree ("hold_id");--> statement-breakpoint
CREATE INDEX "payment_intents_user_id_idx" ON "payment_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payment_intents_dodo_payment_id_idx" ON "payment_intents" USING btree ("dodo_payment_id");--> statement-breakpoint
CREATE INDEX "payment_intents_status_idx" ON "payment_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_intents_incident_idx" ON "payment_intents" USING btree ("created_at") WHERE "payment_intents"."incident_reason" IS NOT NULL;