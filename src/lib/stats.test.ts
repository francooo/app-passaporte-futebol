import { describe, expect, it } from "vitest";
import { computeStats, haversineKm, resultFor, type StatVisit } from "./stats";

const fla = { id: "fla", name: "Flamengo", crestUrl: null };
const bot = { id: "bot", name: "Botafogo", crestUrl: null };
const pal = { id: "pal", name: "Palmeiras", crestUrl: null };

const maracana = { id: "mar", name: "Maracanã", city: "Rio de Janeiro", country: "BRA", lat: -22.9122, lng: -43.2302, capacity: 78838, thumbUrl: null };
const allianz = { id: "all", name: "Allianz Parque", city: "São Paulo", country: "BRA", lat: -23.5275, lng: -46.6789, capacity: 43713, thumbUrl: null };
const kempes = { id: "kem", name: "Mario Alberto Kempes", city: "Córdoba", country: "ARG", lat: -31.3687, lng: -64.2465, capacity: 57000, thumbUrl: null };

const v = (over: Partial<StatVisit>): StatVisit => ({
  kind: "visit",
  date: "2026-09-05",
  stadium: maracana,
  home: null,
  away: null,
  homeScore: null,
  awayScore: null,
  ...over,
});

describe("haversineKm", () => {
  it("Rio → São Paulo ≈ 360 km em linha reta", () => {
    expect(haversineKm(maracana, allianz)).toBeGreaterThan(340);
    expect(haversineKm(maracana, allianz)).toBeLessThan(380);
  });
});

describe("resultFor", () => {
  const game = { home: fla, away: bot, homeScore: 2, awayScore: 1 };
  it("vitória do mandante e derrota do visitante", () => {
    expect(resultFor("fla", game)).toBe("W");
    expect(resultFor("bot", game)).toBe("L");
  });
  it("empate, time que não jogou e partida sem placar", () => {
    expect(resultFor("fla", { ...game, awayScore: 2 })).toBe("D");
    expect(resultFor("pal", game)).toBeNull();
    expect(resultFor("fla", { ...game, homeScore: null })).toBeNull();
  });
});

describe("computeStats", () => {
  const visits: StatVisit[] = [
    v({ kind: "match", date: "2026-09-05", home: fla, away: bot, homeScore: 2, awayScore: 1 }),
    v({ kind: "match", date: "2025-03-01", stadium: allianz, home: pal, away: fla, homeScore: 1, awayScore: 1 }),
    v({ kind: "match", date: "2026-07-12", stadium: kempes, home: bot, away: fla, homeScore: 3, awayScore: 0 }),
    v({ kind: "visit", date: "2025-08-18", stadium: allianz }),
    v({ kind: "visit", date: null, stadium: maracana }),
  ];

  it("conta países, estádios, partidas e visitas", () => {
    const s = computeStats(visits, { home: null, teamId: null });
    expect(s).toMatchObject({ countries: 2, stadiums: 3, matches: 3, visits: 2 });
  });

  it("sem cidade cadastrada, km fica nulo; com cidade, soma ida e volta", () => {
    expect(computeStats(visits, { home: null, teamId: null }).km).toBeNull();
    const rio = { city: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 };
    const km = computeStats([v({ stadium: allianz })], { home: rio, teamId: null }).km!;
    expect(km).toBeGreaterThan(680);
    expect(km).toBeLessThan(760);
  });

  it("registros por ano ignoram os sem data e saem em ordem", () => {
    expect(computeStats(visits, { home: null, teamId: null }).byYear).toEqual([
      { year: 2025, count: 2 },
      { year: 2026, count: 2 },
    ]);
  });

  it("desempenho do time escolhido (mandante e visitante)", () => {
    const s = computeStats(visits, { home: null, teamId: "fla" });
    expect(s.team).toMatchObject({ wins: 1, draws: 1, losses: 1, winRate: 33 });
    expect(s.team?.team.name).toBe("Flamengo");
  });

  it("sem time escolhido usa o mais visto; maiores estádios sem repetir", () => {
    const s = computeStats(visits, { home: null, teamId: null });
    expect(s.team?.team.id).toBe("fla");
    expect(s.teamsSeen.map((t) => t.id)).toEqual(["fla", "bot", "pal"]);
    expect(s.biggestStadiums.map((b) => b.name)).toEqual(["Maracanã", "Mario Alberto Kempes", "Allianz Parque"]);
  });

  it("sem partidas, não há desempenho de time", () => {
    expect(computeStats([v({})], { home: null, teamId: null }).team).toBeNull();
  });
});
