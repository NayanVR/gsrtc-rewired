CREATE TABLE "agent_etop_transactions" (
	"agent_code" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"transaction_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"agent_code" text PRIMARY KEY NOT NULL,
	"allotted_routes" jsonb NOT NULL,
	"allotted_seats" integer DEFAULT 0 NOT NULL,
	"application_no" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"division" text NOT NULL,
	"email" text NOT NULL,
	"mobile" text NOT NULL,
	"name" text NOT NULL,
	"pan" text NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	CONSTRAINT "agents_application_no_unique" UNIQUE("application_no")
);
--> statement-breakpoint
ALTER TABLE "agent_etop_transactions" ADD CONSTRAINT "agent_etop_transactions_agent_code_agents_agent_code_fk" FOREIGN KEY ("agent_code") REFERENCES "public"."agents"("agent_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_etop_transactions_agent_code_idx" ON "agent_etop_transactions" USING btree ("agent_code");--> statement-breakpoint
CREATE INDEX "agents_application_no_idx" ON "agents" USING btree ("application_no");--> statement-breakpoint
CREATE INDEX "agents_mobile_idx" ON "agents" USING btree ("mobile");