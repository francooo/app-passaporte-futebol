ALTER TABLE "visit_photos" ADD COLUMN "data" "bytea" NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD COLUMN "thumb" "bytea" NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD COLUMN "mime" text DEFAULT 'image/webp' NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_photos" ADD COLUMN "bytes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "match_id" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "home_score" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "away_score" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;