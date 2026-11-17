import { describe, expect, it } from "vitest";
import { groupByStadium, isUpcomingStatus, upcomingWindow } from "./upcoming";

describe("isUpcomingStatus", () => {
  it("aceita só partidas agendadas", () => {
    expect(isUpcomingStatus("SCHEDULED")).toBe(true);
    expect(isUpcomingStatus("TIMED")).toBe(true);
    for (const s of ["POSTPONED", "CANCELLED", "SUSPENDED", "FINISHED", "IN_PLAY", "AWARDED"]) {
      expect(isUpcomingStatus(s)).toBe(false);
    }
  });
});

describe("upcomingWindow", () => {
  it("vai de hoje até daqui a 14 dias (UTC)", () => {
    expect(upcomingWindow(new Date("2026-11-17T22:30:00Z"))).toEqual({ from: "2026-11-17", to: "2026-12-01" });
  });
});

describe("groupByStadium", () => {
  const row = (stadiumId: string | null, utcDate: string) => ({ stadiumId, utcDate });

  it("agrupa por estádio em ordem de data e limita a quantidade", () => {
    const groups = groupByStadium(
      [
        row("a", "2026-11-25T19:00:00Z"),
        row("a", "2026-11-20T19:00:00Z"),
        row("b", "2026-11-22T21:00:00Z"),
        row("a", "2026-11-28T19:00:00Z"),
        row("a", "2026-11-30T19:00:00Z"),
      ],
      3,
    );
    expect(groups.get("a")?.map((r) => r.utcDate)).toEqual(["2026-11-20T19:00:00Z", "2026-11-25T19:00:00Z", "2026-11-28T19:00:00Z"]);
    expect(groups.get("b")).toHaveLength(1);
  });

  it("ignora partidas sem estádio ligado", () => {
    expect(groupByStadium([row(null, "2026-11-20T19:00:00Z")]).size).toBe(0);
  });
});
