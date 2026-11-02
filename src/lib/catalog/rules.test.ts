import { describe, expect, it } from "vitest";
import {
  cleanAuthor,
  commonsThumb,
  isAcceptedLicense,
  mapCountryId,
  pickCapacity,
  resolvePlace,
  type PlaceNode,
} from "./rules";

describe("pickCapacity", () => {
  it("usa o rank preferido", () => {
    expect(
      pickCapacity([
        { value: 120000, rank: "normal", date: null },
        { value: 66795, rank: "preferred", date: null },
      ]),
    ).toEqual({ capacity: 66795, needsReview: false });
  });

  it("usa o valor mais recente quando há datas", () => {
    expect(
      pickCapacity([
        { value: 95000, rank: "normal", date: "1990-01-01T00:00:00Z" },
        { value: 78838, rank: "normal", date: "2014-06-01T00:00:00Z" },
      ]),
    ).toEqual({ capacity: 78838, needsReview: false });
  });

  it("caso Morumbi: vários valores sem data → menor e marca para revisão", () => {
    expect(
      pickCapacity([
        { value: 120000, rank: "normal", date: null },
        { value: 71200, rank: "normal", date: null },
        { value: 67052, rank: "normal", date: null },
      ]),
    ).toEqual({ capacity: 67052, needsReview: true });
  });

  it("ignora valores obsoletos e inválidos", () => {
    expect(
      pickCapacity([
        { value: 100000, rank: "deprecated", date: null },
        { value: 0, rank: "normal", date: null },
        { value: 45000, rank: "normal", date: null },
      ]),
    ).toEqual({ capacity: 45000, needsReview: false });
    expect(pickCapacity([])).toEqual({ capacity: null, needsReview: false });
  });
});

describe("resolvePlace", () => {
  const nodes = new Map<string, PlaceNode>([
    ["morumbi", { id: "morumbi", label: "Morumbi", parentIds: ["sp-city"], isMunicipality: false, isState: false }],
    ["sp-city", { id: "sp-city", label: "São Paulo", parentIds: ["sp-state"], isMunicipality: true, isState: false }],
    ["sp-state", { id: "sp-state", label: "São Paulo (estado)", parentIds: ["bra"], isMunicipality: false, isState: true }],
  ]);

  it("sobe do bairro até o município e o estado", () => {
    expect(resolvePlace(["morumbi"], nodes)).toEqual({ city: "São Paulo", state: "São Paulo (estado)" });
  });

  it("sem município na hierarquia, usa o local direto", () => {
    const only = new Map<string, PlaceNode>([
      ["x", { id: "x", label: "Distrito X", parentIds: [], isMunicipality: false, isState: false }],
    ]);
    expect(resolvePlace(["x"], only)).toEqual({ city: "Distrito X", state: null });
  });

  it("tolera ciclos na hierarquia", () => {
    const cyc = new Map<string, PlaceNode>([
      ["a", { id: "a", label: "A", parentIds: ["b"], isMunicipality: false, isState: false }],
      ["b", { id: "b", label: "B", parentIds: ["a"], isMunicipality: false, isState: false }],
    ]);
    expect(resolvePlace(["a"], cyc)).toEqual({ city: "A", state: null });
  });
});

describe("cleanAuthor", () => {
  it("remove HTML e decodifica entidades", () => {
    expect(cleanAuthor('<a href="//commons.wikimedia.org/wiki/User:X">Arne Müseler</a> &amp; equipe')).toBe(
      "Arne Müseler & equipe",
    );
    expect(cleanAuthor("<span>Leonef</span>&#32;(2024)")).toBe("Leonef (2024)");
    expect(cleanAuthor("  ")).toBeNull();
    expect(cleanAuthor(null)).toBeNull();
  });
});

describe("isAcceptedLicense", () => {
  it.each([
    ["CC BY-SA 4.0", true],
    ["CC BY 2.0", true],
    ["CC0", true],
    ["Public domain", true],
    ["CC BY-NC-SA 2.0", false],
    ["CC BY-ND 3.0", false],
    ["Fair use", false],
    ["", false],
    [null, false],
  ])("%s → %s", (name, ok) => {
    expect(isAcceptedLicense(name)).toBe(ok);
  });
});

describe("mapCountryId", () => {
  it("mantém ISO3 e corrige os -99 do Natural Earth", () => {
    expect(mapCountryId("BRA", "Brazil")).toBe("BRA");
    expect(mapCountryId("-99", "France")).toBe("FRA");
    expect(mapCountryId("-99", "Norway")).toBe("NOR");
    expect(mapCountryId("-99", "Atlantis")).toBeNull();
  });
});

describe("commonsThumb", () => {
  it("troca para uma largura padrão e remove o rastreio", () => {
    expect(
      commonsThumb(
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Maracana_2022.jpg/800px-Maracana_2022.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo",
        330,
      ),
    ).toBe("https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Maracana_2022.jpg/330px-Maracana_2022.jpg");
    expect(commonsThumb(null, 330)).toBeNull();
  });
});
