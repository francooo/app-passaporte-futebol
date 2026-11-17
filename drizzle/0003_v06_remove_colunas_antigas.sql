CREATE TABLE "competitions" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"emblem_url" text,
	"last_synced_at" timestamp,
	"sync_error" text
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'football-data' NOT NULL,
	"provider_id" text NOT NULL,
	"competition_code" text NOT NULL,
	"utc_date" timestamp NOT NULL,
	"status" text NOT NULL,
	"home_team_id" text NOT NULL,
	"away_team_id" text NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"stadium_id" text
);
--> statement-breakpoint
ALTER TABLE "visits" DROP CONSTRAINT "visits_score_format";--> statement-breakpoint
DROP INDEX "visits_user_idx";--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "short_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "venue_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_city" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_lat" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_lng" double precision;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_code_competitions_code_fk" FOREIGN KEY ("competition_code") REFERENCES "public"."competitions"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stadium_id_stadiums_id_fk" FOREIGN KEY ("stadium_id") REFERENCES "public"."stadiums"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "matches_provider_idx" ON "matches" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "matches_date_idx" ON "matches" USING btree ("utc_date");--> statement-breakpoint
CREATE INDEX "matches_stadium_idx" ON "matches" USING btree ("stadium_id","utc_date");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_favorite_team_id_teams_id_fk" FOREIGN KEY ("favorite_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teams_provider_idx" ON "teams" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "visits_user_idx" ON "visits" USING btree ("user_id","date");--> statement-breakpoint
ALTER TABLE "visit_photos" DROP COLUMN "blob_url";--> statement-breakpoint
ALTER TABLE "visits" DROP COLUMN "score";