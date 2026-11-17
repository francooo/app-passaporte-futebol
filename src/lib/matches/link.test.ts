import { describe, expect, it } from "vitest";
import { areaToIso3, clubTokens, findTeamStadium, normalizeName, stadiumKey, type CatalogStadium } from "./link";

const stadiums: CatalogStadium[] = [
  { id: "mar", name: "Estádio Jornalista Mário Filho", country: "BRA", capacity: 78838, clubs: ["Clube de Regatas do Flamengo", "Fluminense Football Club"] },
  { id: "nil", name: "Estádio Nilton Santos", country: "BRA", capacity: 46931, clubs: ["Botafogo de Futebol e Regatas"] },
  { id: "gav", name: "Estádio da Gávea", country: "BRA", capacity: 4000, clubs: ["Clube de Regatas do Flamengo"] },
  { id: "old", name: "Old Trafford", country: "GBR", capacity: 74310, clubs: ["Manchester United F.C."] },
];

describe("normalização", () => {
  it("remove acentos e símbolos", () => {
    expect(normalizeName("Estádio Jornalista Mário Filho (Maracanã)")).toBe("estadio jornalista mario filho maracana");
  });
  it("chave do estádio ignora palavras genéricas", () => {
    expect(stadiumKey("Estádio do Morumbi")).toBe(stadiumKey("Morumbi"));
    expect(stadiumKey("Stade de France")).toBe("france");
  });
  it("tokens do clube ignoram siglas e palavras comuns", () => {
    expect(clubTokens("CR Flamengo")).toEqual(["flamengo"]);
    expect(clubTokens("Botafogo FR")).toEqual(["botafogo"]);
  });
  it("Inglaterra e Escócia viram GBR", () => {
    expect(areaToIso3("ENG")).toBe("GBR");
    expect(areaToIso3("BRA")).toBe("BRA");
  });
});

describe("findTeamStadium", () => {
  it("usa o nome do estádio do provedor quando bate com o catálogo", () => {
    expect(findTeamStadium({ name: "Botafogo FR", shortName: "Botafogo", venue: "Estádio Nilton Santos", country: "BRA" }, stadiums)).toBe("nil");
  });

  it("senão, o maior estádio cujos mandantes contêm o nome do time", () => {
    expect(findTeamStadium({ name: "CR Flamengo", shortName: "Flamengo", venue: "Maracanã", country: "BRA" }, stadiums)).toBe("mar");
  });

  it("respeita o país e não liga quando não há candidato", () => {
    expect(findTeamStadium({ name: "Manchester United FC", shortName: "Man United", venue: "Old Trafford", country: "GBR" }, stadiums)).toBe("old");
    expect(findTeamStadium({ name: "Clube Desconhecido", shortName: null, venue: null, country: "BRA" }, stadiums)).toBeNull();
  });
});
