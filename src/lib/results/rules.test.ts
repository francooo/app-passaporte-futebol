import { describe, expect, it } from "vitest";
import {
  expectedEndAt,
  isCalledOff,
  isDueForCheck,
  isFinalStatus,
  needsManualResult,
  officialFdScore,
  predictionOutcome,
  toScore,
} from "./rules";

const kickoff = new Date("2026-11-24T22:00:00Z");
const at = (iso: string) => new Date(iso);

describe("expectedEndAt", () => {
  it("é o início + 2 h", () => {
    expect(expectedEndAt(kickoff).toISOString()).toBe("2026-11-25T00:00:00.000Z");
  });
});

describe("isDueForCheck", () => {
  it("não busca antes do fim previsto", () => {
    expect(isDueForCheck({ kickoffAt: kickoff, resultCheckedAt: null }, at("2026-11-24T23:59:00Z"))).toBe(false);
  });
  it("busca depois do fim previsto", () => {
    expect(isDueForCheck({ kickoffAt: kickoff, resultCheckedAt: null }, at("2026-11-25T00:01:00Z"))).toBe(true);
  });
  it("espera 20 min entre tentativas", () => {
    const checked = at("2026-11-25T00:05:00Z");
    expect(isDueForCheck({ kickoffAt: kickoff, resultCheckedAt: checked }, at("2026-11-25T00:15:00Z"))).toBe(false);
    expect(isDueForCheck({ kickoffAt: kickoff, resultCheckedAt: checked }, at("2026-11-25T00:26:00Z"))).toBe(true);
  });
  it("desiste depois de 3 dias e pede o resultado manual", () => {
    expect(isDueForCheck({ kickoffAt: kickoff, resultCheckedAt: null }, at("2026-11-28T01:00:00Z"))).toBe(false);
    expect(needsManualResult(kickoff, at("2026-11-28T01:00:00Z"))).toBe(true);
    expect(needsManualResult(kickoff, at("2026-11-25T01:00:00Z"))).toBe(false);
  });
  it("sem horário de início não busca", () => {
    expect(isDueForCheck({ kickoffAt: null, resultCheckedAt: null })).toBe(false);
  });
});

describe("predictionOutcome", () => {
  it("placar exato", () => {
    expect(predictionOutcome({ home: 2, away: 1 }, { home: 2, away: 1 })).toBe("exact");
  });
  it("acertou o vencedor ou o empate", () => {
    expect(predictionOutcome({ home: 3, away: 0 }, { home: 1, away: 0 })).toBe("winner");
    expect(predictionOutcome({ home: 1, away: 1 }, { home: 2, away: 2 })).toBe("winner");
  });
  it("errou", () => {
    expect(predictionOutcome({ home: 2, away: 0 }, { home: 0, away: 1 })).toBe("miss");
    expect(predictionOutcome({ home: 1, away: 1 }, { home: 1, away: 0 })).toBe("miss");
  });
  it("sem palpite ou sem resultado", () => {
    expect(predictionOutcome(null, { home: 1, away: 0 })).toBeNull();
    expect(predictionOutcome({ home: 1, away: 0 }, null)).toBeNull();
    expect(toScore(1, null)).toBeNull();
  });
});

describe("status das fontes", () => {
  it("encerrado", () => {
    expect(isFinalStatus("football-data", "FINISHED")).toBe(true);
    expect(isFinalStatus("football-data", "IN_PLAY")).toBe(false);
    for (const s of ["FT", "AET", "PEN"]) expect(isFinalStatus("api-football", s)).toBe(true);
    expect(isFinalStatus("api-football", "2H")).toBe(false);
  });
  it("adiado ou cancelado", () => {
    expect(isCalledOff("football-data", "POSTPONED")).toBe(true);
    expect(isCalledOff("api-football", "PST")).toBe(true);
    expect(isCalledOff("api-football", "FT")).toBe(false);
  });
});

describe("officialFdScore", () => {
  it("tira os pênaltis do placar final", () => {
    expect(
      officialFdScore({ duration: "PENALTY_SHOOTOUT", fullTime: { home: 5, away: 4 }, penalties: { home: 4, away: 3 } }),
    ).toEqual({ home: 1, away: 1 });
  });
  it("mantém o placar do tempo normal e da prorrogação", () => {
    expect(officialFdScore({ duration: "REGULAR", fullTime: { home: 2, away: 0 } })).toEqual({ home: 2, away: 0 });
    expect(officialFdScore({ duration: "EXTRA_TIME", fullTime: { home: 3, away: 2 } })).toEqual({ home: 3, away: 2 });
  });
});
