import { describe, expect, it } from "vitest";
import { sessionRevoked } from "./session-revocation";

describe("sessionRevoked", () => {
  const cut = new Date("2026-11-18T12:00:00Z");

  it("sem revogação, toda sessão vale", () => {
    expect(sessionRevoked(undefined, null)).toBe(false);
    expect(sessionRevoked(1, null)).toBe(false);
  });

  it("sessão aberta antes da revogação cai; depois continua", () => {
    expect(sessionRevoked(cut.getTime() - 1, cut)).toBe(true);
    expect(sessionRevoked(cut.getTime() + 1, cut)).toBe(false);
  });

  it("sessão antiga sem authAt cai quando há revogação", () => {
    expect(sessionRevoked(undefined, cut)).toBe(true);
  });
});
