ALTER TABLE "teams" ADD COLUMN "api_football_id" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "predicted_home_score" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "predicted_away_score" integer;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "result_status" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "result_source" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "kickoff_at" timestamp;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "external_fixture_id" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "result_checked_at" timestamp;--> statement-breakpoint
CREATE INDEX "visits_pending_idx" ON "visits" USING btree ("result_status","kickoff_at");--> statement-breakpoint
-- Carimbos de partida já existentes têm placar: viram "final" (origem: partida importada ou manual)
UPDATE "visits" SET "result_status" = 'final', "result_source" = CASE WHEN "match_id" IS NOT NULL THEN 'football-data' ELSE 'manual' END WHERE "kind" = 'match';
