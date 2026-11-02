import { isNotNull, or } from "drizzle-orm";
import { stadiums } from "@/db/schema";

/**
 * Itens sem capacidade e sem localização (ex.: artigos "Cronologia do…", cadastros vazios) ficam no banco
 * mas não aparecem nas listas nem contam para o país.
 */
export const hasUsefulData = or(isNotNull(stadiums.capacity), isNotNull(stadiums.lat));
