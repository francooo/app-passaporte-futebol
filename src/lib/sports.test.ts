import { describe, expect, it } from "vitest";
import { visitSchema } from "../../shared/schemas";
import { parseSport, scoreError, SPORT_INFO } from "../../shared/sports";
import { expectedEndAt, predictionOutcome } from "./results/rules";
import { computeStats, type StatVisit } from "./stats";

describe("scoreError", () => {
  it("vôlei: vencedor com 3 sets e o outro de 0 a 2", () => {
    for (const [h, a] of [[3, 0], [3, 1], [3, 2], [0, 3], [2, 3]]) expect(scoreError("volei", h, a)).toBeNull();
    for (const [h, a] of [[3, 3], [2, 2], [4, 1], [2, 1], [0, 0]]) expect(scoreError("volei", h, a)).not.toBeNull();
  });

  it("basquete: aceita mais de 99 pontos, sem empate", () => {
    expect(scoreError("basquete", 112, 98)).toBeNull();
    expect(scoreError("basquete", 88, 88)).toMatch(/empate/);
    expect(scoreError("basquete", 251, 80)).not.toBeNull();
  });

  it("futebol e futsal: empate vale, teto de 99", () => {
    expect(scoreError("futebol", 1, 1)).toBeNull();
    expect(scoreError("futsal", 4, 4)).toBeNull();
    expect(scoreError("futebol", 100, 0)).not.toBeNull();
  });
});

describe("parseSport", () => {
  it("só aceita esportes conhecidos", () => {
    expect(parseSport("volei")).toBe("volei");
    expect(parseSport("handebol")).toBeNull();
    expect(parseSport(null)).toBeNull();
  });
});

describe("visitSchema com esporte", () => {
  const base = { kind: "match", stadiumId: "s1", homeTeamName: "Sesi Bauru", awayTeamName: "Minas" } as const;

  it("sem esporte, vale futebol (clientes antigos)", () => {
    const parsed = visitSchema.safeParse({ ...base, homeScore: 2, awayScore: 1 });
    expect(parsed.success && parsed.data.sport).toBe("futebol");
  });

  it("recusa placar de vôlei inválido e palpite com empate no basquete", () => {
    expect(visitSchema.safeParse({ ...base, sport: "volei", homeScore: 3, awayScore: 1 }).success).toBe(true);
    expect(visitSchema.safeParse({ ...base, sport: "volei", homeScore: 3, awayScore: 3 }).success).toBe(false);
    expect(
      visitSchema.safeParse({ ...base, sport: "basquete", resultPending: true, predictedHomeScore: 80, predictedAwayScore: 80 }).success,
    ).toBe(false);
    expect(visitSchema.safeParse({ ...base, sport: "basquete", homeScore: 120, awayScore: 101 }).success).toBe(true);
  });
});

describe("regras por esporte", () => {
  it("fim previsto usa a duração do esporte", () => {
    const kickoff = new Date("2026-11-24T20:00:00Z");
    expect(expectedEndAt(kickoff).getTime() - kickoff.getTime()).toBe(SPORT_INFO.futebol.durationMs);
    expect(expectedEndAt(kickoff, "volei").getTime() - kickoff.getTime()).toBe(SPORT_INFO.volei.durationMs);
  });

  it("palpite de vôlei: vencedor certo com sets errados", () => {
    expect(predictionOutcome({ home: 3, away: 0 }, { home: 3, away: 2 })).toBe("winner");
    expect(predictionOutcome({ home: 3, away: 1 }, { home: 1, away: 3 })).toBe("miss");
  });
});

describe("computeStats com vários esportes", () => {
  const stadium = { id: "a1", name: "Arena", city: "Bauru", country: "BRA", lat: null, lng: null, capacity: null, thumbUrl: null };
  const team = (id: string) => ({ id, name: id, crestUrl: null });
  const v = (sport: StatVisit["sport"], home: string, away: string, hs: number, as: number): StatVisit => ({
    kind: "match",
    sport,
    date: "2026-11-01",
    stadium,
    home: team(home),
    away: team(away),
    homeScore: hs,
    awayScore: as,
  });

  it("conta partidas por esporte e mede o time só no futebol", () => {
    const stats = computeStats(
      [v("volei", "bauru", "minas", 3, 1), v("volei", "minas", "sesi", 3, 0), v(undefined, "inter", "gremio", 2, 0)],
      { home: null, teamId: null },
    );
    expect(stats.bySport).toEqual([
      { sport: "volei", matches: 2 },
      { sport: "futebol", matches: 1 },
    ]);
    expect(stats.teamsSeen.map((t) => t.id)).toEqual(["inter", "gremio"]);
    expect(stats.team?.team.id).toBe("inter");
  });
});
