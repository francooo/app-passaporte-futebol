import { describe, expect, it } from "vitest";
import { nameOverlap, pickFixture, pickTeam, teamSearchTerm } from "./pick";

describe("nomes", () => {
  it("compara sem acentos e sem siglas", () => {
    expect(nameOverlap("Grêmio", "Gremio")).toBe(1);
    expect(nameOverlap("Goiás EC", "Goias")).toBe(1);
    expect(nameOverlap("Goiás", "Vila Nova")).toBe(0);
  });
  it("termo de busca: palavra distintiva mais longa", () => {
    expect(teamSearchTerm("Clube do Remo")).toBe("remo");
    expect(teamSearchTerm("Associação Chapecoense de Futebol")).toBe("chapecoense");
    expect(teamSearchTerm("CRB")).toBe("crb");
    expect(teamSearchTerm("FC")).toBeNull();
  });
});

describe("pickTeam", () => {
  const candidates = [
    { id: 1, name: "Remo" },
    { id: 2, name: "Paysandu" },
  ];
  it("escolhe o time com mais palavras em comum", () => {
    expect(pickTeam(["Clube do Remo", "Remo"], candidates)?.id).toBe(1);
  });
  it("não escolhe quando nada bate", () => {
    expect(pickTeam(["Ceará"], candidates)).toBeNull();
  });
});

describe("pickFixture", () => {
  const f = (home: string, away: string) => ({ teams: { home: { name: home }, away: { name: away } } });
  it("um jogo só no dia: aceita", () => {
    expect(pickFixture([f("Remo", "Goias")], "Qualquer")).toEqual(f("Remo", "Goias"));
  });
  it("vários jogos: confere o adversário, em qualquer ordem", () => {
    const list = [f("Remo", "Goias"), f("Paysandu", "Remo")];
    expect(pickFixture(list, "Paysandu")).toEqual(f("Paysandu", "Remo"));
    expect(pickFixture(list, "Ceará")).toBeNull();
  });
  it("nenhum jogo", () => {
    expect(pickFixture([], "Remo")).toBeNull();
  });
});
