import { describe, expect, it } from "vitest";
import { findVenue, freePlanDays, normalizeStatus, parseGame, teamDisplayName, type RawGame } from "./api-sports-parse";

// Respostas reais da API-Sports (24/11/2026), resumidas
const basketball: RawGame = {
  id: 519776,
  date: "2026-11-23T00:00:00+00:00",
  venue: "Capital One Arena",
  status: { long: "Game Finished", short: "FT" },
  league: { id: 12, name: "NBA", logo: "https://media.api-sports.io/basketball/leagues/12.png", season: "2026-2027" },
  teams: {
    home: { id: 161, name: "Washington Wizards", logo: "https://media.api-sports.io/basketball/teams/161.png" },
    away: { id: 153, name: "Orlando Magic", logo: "https://media.api-sports.io/basketball/teams/153.png" },
  },
  scores: { home: { total: 116 }, away: { total: 96 } },
};

const volleyball: RawGame = {
  id: 214991,
  date: "2026-11-23T21:30:00+00:00",
  status: { long: "Finished", short: "FT" },
  league: { id: 24, name: "Superliga Women", logo: "https://media.api-sports.io/volley/leagues/24.png", season: 2026 },
  teams: {
    home: { id: 158, name: "Minas W", logo: "https://media.api-sports.io/volley/teams/158.png" },
    away: { id: 165, name: "Sesi Bauru W", logo: "https://media.api-sports.io/volley/teams/165.png" },
  },
  scores: { home: 2, away: 3 },
};

describe("parseGame", () => {
  it("basquete: placar pelo total e local do jogo", () => {
    const g = parseGame(basketball);
    expect(g).toMatchObject({ id: "519776", status: "FINISHED", homeScore: 116, awayScore: 96, venue: "Capital One Arena", leagueId: 12 });
    expect(g.utcDate.toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });

  it("vôlei: placar em sets, time feminino com (F)", () => {
    const g = parseGame(volleyball);
    expect(g).toMatchObject({ homeScore: 2, awayScore: 3, venue: null, status: "FINISHED" });
    expect(g.home.name).toBe("Minas (F)");
  });

  it("jogo em andamento não tem resultado", () => {
    const g = parseGame({ ...volleyball, status: { short: "S3" }, scores: { home: 1, away: 1 } });
    expect(g).toMatchObject({ status: "IN_PLAY", homeScore: null, awayScore: null });
  });
});

describe("normalizeStatus", () => {
  it("usa o vocabulário do football-data", () => {
    expect(normalizeStatus("NS")).toBe("TIMED");
    expect(normalizeStatus("AOT")).toBe("FINISHED");
    expect(normalizeStatus("POST")).toBe("POSTPONED");
    expect(normalizeStatus("Q2")).toBe("IN_PLAY");
  });
});

describe("findVenue", () => {
  const pool = [
    { id: "g1", name: "Ginásio Gigantinho" },
    { id: "g2", name: "Arena Carioca 1" },
    { id: "g3", name: "Ginásio do Ibirapuera" },
  ];
  it("casa nome com ou sem prefixo", () => {
    expect(findVenue("Gigantinho", pool)).toBe("g1");
    expect(findVenue("Ginasio do Ibirapuera", pool)).toBe("g3");
  });
  it("sem local ou ambíguo: nada", () => {
    expect(findVenue(null, pool)).toBeNull();
    expect(findVenue("Arena", pool)).toBeNull();
  });
});

it("teamDisplayName e freePlanDays", () => {
  expect(teamDisplayName("Sesi Bauru")).toBe("Sesi Bauru");
  expect(freePlanDays(new Date("2026-11-24T12:00:00Z"))).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
});
