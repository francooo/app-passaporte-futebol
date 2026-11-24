import { describe, expect, it } from "vitest";
import { moderationTeamSchema, moderationVenueSchema } from "../../shared/schemas";
import { nameTokens, rankDuplicates } from "./moderation-rules";

describe("rankDuplicates", () => {
  const venues = [
    { id: "a", name: "Ginásio Gigantinho" },
    { id: "b", name: "Estádio Beira-Rio" },
    { id: "c", name: "Ginásio Tesourinha" },
  ];

  it("acha o mesmo local escrito de outro jeito", () => {
    expect(rankDuplicates("Gigantinho", venues).map((v) => v.id)).toEqual(["a"]);
    expect(rankDuplicates("Ginasio do Gigantinho", venues)[0].id).toBe("a");
  });

  it("nome só com palavras genéricas não sugere nada", () => {
    expect(rankDuplicates("Ginásio Municipal", venues)).toEqual([]);
  });

  it("times: tokens distintivos", () => {
    const teams = [
      { id: "1", name: "Sesi Bauru" },
      { id: "2", name: "Sada Cruzeiro" },
      { id: "3", name: "Bauru Basket" },
    ];
    expect(rankDuplicates("Sesi Bauru Vôlei", teams).map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("nameTokens ignora acentos e palavras genéricas", () => {
    expect(nameTokens("Associação Atlética Magnus Futsal")).toEqual(["atletica", "magnus"]);
  });
});

describe("schemas da moderação", () => {
  it("aprovar com edição, mesclar com alvo, recusar", () => {
    expect(moderationVenueSchema.safeParse({ action: "approve", edits: { state: "SP", sports: ["futsal"] } }).success).toBe(true);
    expect(moderationVenueSchema.safeParse({ action: "merge" }).success).toBe(false);
    expect(moderationVenueSchema.safeParse({ action: "merge", targetId: "x" }).success).toBe(true);
    expect(moderationTeamSchema.safeParse({ action: "reject" }).success).toBe(true);
    expect(moderationTeamSchema.safeParse({ action: "approve", edits: { name: "" } }).success).toBe(false);
  });
});
