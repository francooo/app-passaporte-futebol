CREATE TABLE "countries" (
	"iso3" text PRIMARY KEY NOT NULL,
	"iso2" text,
	"name_pt" text NOT NULL,
	"wikidata_id" text,
	"stadium_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp,
	"sync_error" text
);
--> statement-breakpoint
DROP INDEX "stadiums_country_idx";--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "capacity_needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "capacity_override" integer;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "address_source" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "opened_on" date;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "clubs" text[];--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "photo_author" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "photo_license" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "photo_license_url" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "photo_page_url" text;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "wikidata_id" text;--> statement-breakpoint
CREATE INDEX "stadiums_country_idx" ON "stadiums" USING btree ("country","capacity");--> statement-breakpoint
ALTER TABLE "stadiums" ADD CONSTRAINT "stadiums_wikidata_id_unique" UNIQUE("wikidata_id");