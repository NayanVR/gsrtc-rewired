CREATE TABLE "bus_seats" (
	"bus_id" text NOT NULL,
	"deck" text NOT NULL,
	"default_status" text DEFAULT 'available' NOT NULL,
	"kind" text NOT NULL,
	"seat_no" text NOT NULL,
	CONSTRAINT "bus_seats_bus_id_seat_no_pk" PRIMARY KEY("bus_id","seat_no")
);
--> statement-breakpoint
CREATE TABLE "buses" (
	"active" boolean DEFAULT true NOT NULL,
	"amenities" jsonb NOT NULL,
	"bus_type" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"registration_no" text NOT NULL,
	"service_index" integer NOT NULL,
	CONSTRAINT "buses_registration_no_unique" UNIQUE("registration_no"),
	CONSTRAINT "buses_service_index_unique" UNIQUE("service_index")
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"name" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_routes" (
	"active" boolean DEFAULT true NOT NULL,
	"from_city" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"to_city" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_schedules" (
	"active" boolean DEFAULT true NOT NULL,
	"bus_id" text NOT NULL,
	"departure_minutes" integer NOT NULL,
	"duration_min" integer NOT NULL,
	"fare_from" numeric(10, 2) NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"service_index" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bus_seats" ADD CONSTRAINT "bus_seats_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_from_city_cities_name_fk" FOREIGN KEY ("from_city") REFERENCES "public"."cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_to_city_cities_name_fk" FOREIGN KEY ("to_city") REFERENCES "public"."cities"("name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_schedules" ADD CONSTRAINT "trip_schedules_bus_id_buses_id_fk" FOREIGN KEY ("bus_id") REFERENCES "public"."buses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_schedules" ADD CONSTRAINT "trip_schedules_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bus_seats_bus_idx" ON "bus_seats" USING btree ("bus_id");--> statement-breakpoint
CREATE INDEX "buses_type_idx" ON "buses" USING btree ("bus_type");--> statement-breakpoint
CREATE UNIQUE INDEX "transport_routes_from_to_uidx" ON "transport_routes" USING btree ("from_city","to_city");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_schedules_route_service_uidx" ON "trip_schedules" USING btree ("route_id","service_index");--> statement-breakpoint
CREATE INDEX "trip_schedules_route_idx" ON "trip_schedules" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "trip_schedules_bus_idx" ON "trip_schedules" USING btree ("bus_id");--> statement-breakpoint
INSERT INTO "cities" ("name") VALUES
	('Ahmedabad'),
	('Vadodara'),
	('Surat'),
	('Rajkot'),
	('Bhavnagar'),
	('Jamnagar'),
	('Gandhinagar'),
	('Junagadh'),
	('Bhuj'),
	('Navsari'),
	('Anand'),
	('Mehsana'),
	('Porbandar'),
	('Valsad'),
	('Palanpur');--> statement-breakpoint
INSERT INTO "buses" (
	"id",
	"registration_no",
	"service_index",
	"bus_type",
	"amenities"
) VALUES
	('bus-volvo-ac-sleeper', 'GJ-18-Z-1001', 0, 'Volvo AC Sleeper', '["charging", "water", "cctv", "blanket", "reading-light"]'::jsonb),
	('bus-ac-seater', 'GJ-18-Z-1002', 1, 'AC Seater', '["charging", "water", "cctv"]'::jsonb),
	('bus-sleeper', 'GJ-18-Z-1003', 2, 'Sleeper', '["charging", "blanket", "reading-light"]'::jsonb),
	('bus-express', 'GJ-18-Z-1004', 3, 'Express', '["cctv"]'::jsonb),
	('bus-gurjar-nagari', 'GJ-18-Z-1005', 4, 'Gurjar Nagari', '["water", "cctv"]'::jsonb),
	('bus-electric', 'GJ-18-Z-1006', 5, 'Electric', '["charging", "wifi", "cctv"]'::jsonb);--> statement-breakpoint
INSERT INTO "bus_seats" (
	"bus_id",
	"deck",
	"default_status",
	"kind",
	"seat_no"
)
SELECT
	bus."id",
	CASE
		WHEN bus."bus_type" LIKE '%Sleeper%' AND seat.number > 20 THEN 'upper'
		ELSE 'lower'
	END,
	CASE
		WHEN ((seat.number * 7 + bus."service_index" * 3) % 10) < 3 THEN 'booked'
		WHEN ((seat.number * 7 + bus."service_index" * 3) % 10) = 3 AND seat.number <= 8 THEN 'ladies'
		ELSE 'available'
	END,
	CASE
		WHEN bus."bus_type" LIKE '%Sleeper%' THEN 'sleeper'
		ELSE 'seater'
	END,
	seat.number::text
FROM "buses" AS bus
CROSS JOIN generate_series(1, 40) AS seat(number);--> statement-breakpoint
INSERT INTO "transport_routes" ("id", "from_city", "to_city")
SELECT
	origin."name" || '~' || destination."name",
	origin."name",
	destination."name"
FROM "cities" AS origin
CROSS JOIN "cities" AS destination
WHERE origin."name" <> destination."name";--> statement-breakpoint
INSERT INTO "trip_schedules" (
	"id",
	"bus_id",
	"departure_minutes",
	"duration_min",
	"fare_from",
	"route_id",
	"service_index"
)
SELECT
	route."id" || '~' || bus."service_index"::text,
	bus."id",
	375 + bus."service_index" * 180,
	150 + bus."service_index" * 20,
	(147 + bus."service_index" * 45)::numeric(10, 2),
	route."id",
	bus."service_index"
FROM "transport_routes" AS route
CROSS JOIN "buses" AS bus;
