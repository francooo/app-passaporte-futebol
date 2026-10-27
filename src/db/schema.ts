import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { mode: "date" }).notNull().defaultNow();

export const roleEnum = pgEnum("role", ["user", "moderator", "admin"]);
export const statusEnum = pgEnum("catalog_status", ["approved", "pending", "rejected"]);
export const teamKindEnum = pgEnum("team_kind", ["club", "national"]);
export const visitKindEnum = pgEnum("visit_kind", ["visit", "match"]);

// ── Auth.js (formato exigido pelo @auth/drizzle-adapter) ─────────────────────

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Campos do Passaporte
  passwordHash: text("password_hash"),
  bio: text("bio"),
  favoriteTeamId: text("favorite_team_id"),
  nationality: text("nationality"),
  state: text("state"),
  language: text("language").notNull().default("pt"),
  isPrivate: boolean("is_private").notNull().default(false),
  role: roleEnum("role").notNull().default("user"),
  premiumUntil: timestamp("premium_until", { mode: "date" }),
  createdAt: createdAt(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/** Recuperação de senha: guardamos só o hash do token enviado por e-mail. */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { mode: "date" }),
  createdAt: createdAt(),
});

// ── Catálogo ─────────────────────────────────────────────────────────────────

export const stadiums = pgTable(
  "stadiums",
  {
    id: id(),
    name: text("name").notNull(),
    city: text("city").notNull(),
    state: text("state"),
    /** ISO 3166-1 alfa-3, igual aos ids do world-map.svg */
    country: text("country").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    capacity: integer("capacity"),
    photoUrl: text("photo_url"),
    source: text("source"),
    sourceUpdatedAt: date("source_updated_at", { mode: "date" }),
    status: statusEnum("status").notNull().default("pending"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("stadiums_country_idx").on(t.country), index("stadiums_name_idx").on(t.name)],
);

export const teams = pgTable(
  "teams",
  {
    id: id(),
    name: text("name").notNull(),
    country: text("country").notNull(),
    kind: teamKindEnum("kind").notNull().default("club"),
    crestUrl: text("crest_url"),
    specialBadge: text("special_badge"),
    status: statusEnum("status").notNull().default("pending"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("teams_name_idx").on(t.name)],
);

// ── Visitas e partidas ───────────────────────────────────────────────────────

export const visits = pgTable(
  "visits",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stadiumId: text("stadium_id")
      .notNull()
      .references(() => stadiums.id, { onDelete: "restrict" }),
    kind: visitKindEnum("kind").notNull(),
    /** Opcional: "pode registrar sem data" */
    date: date("date", { mode: "date" }),
    homeTeamId: text("home_team_id").references(() => teams.id, { onDelete: "set null" }),
    awayTeamId: text("away_team_id").references(() => teams.id, { onDelete: "set null" }),
    score: text("score"),
    competition: text("competition"),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("visits_user_idx").on(t.userId, t.createdAt),
    check("visits_score_format", sql`${t.score} IS NULL OR ${t.score} ~ '^\\d{1,2}-\\d{1,2}$'`),
  ],
);

export const visitPhotos = pgTable(
  "visit_photos",
  {
    id: id(),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    blobUrl: text("blob_url").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("visit_photos_position_idx").on(t.visitId, t.position)],
);

// ── Moderação ────────────────────────────────────────────────────────────────

export const moderationLog = pgTable("moderation_log", {
  id: id(),
  kind: text("kind").notNull(),
  targetId: text("target_id").notNull(),
  action: text("action").notNull(),
  actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
  data: jsonb("data"),
  createdAt: createdAt(),
});
