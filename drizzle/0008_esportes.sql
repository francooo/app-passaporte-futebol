CREATE TYPE "public"."sport" AS ENUM('futebol', 'volei', 'basquete', 'futsal');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('estadio', 'arena', 'ginasio');--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "sport" "sport" DEFAULT 'futebol' NOT NULL;--> statement-breakpoint
ALTER TABLE "competitions" ADD COLUMN "provider" text DEFAULT 'football-data' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "sport" "sport" DEFAULT 'futebol' NOT NULL;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "sports" "sport"[] DEFAULT '{futebol}'::sport[] NOT NULL;--> statement-breakpoint
ALTER TABLE "stadiums" ADD COLUMN "venue_type" "venue_type" DEFAULT 'estadio' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "sport" "sport" DEFAULT 'futebol' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "home_stadium_id" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "sport" "sport" DEFAULT 'futebol' NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_home_stadium_id_stadiums_id_fk" FOREIGN KEY ("home_stadium_id") REFERENCES "public"."stadiums"("id") ON DELETE set null ON UPDATE no action;