"use client";

import { useState } from "react";
import type { UpcomingMatch } from "@shared/api-types";
import { KitIcon } from "@/components/ui/kit-icon";
import { TeamCrest } from "./team-crest";

// Fuso do aparelho do usuário (sem timeZone fixo)
const when = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** "sáb, 22/11, 16:00" */
export function formatKickoff(utcDate: string) {
  // O Intl separa a hora com espaço estreito (U+202F); vira espaço comum
  return when.format(new Date(utcDate)).replace(/\./g, "").replace(/\s/g, " ");
}

/** Próximos jogos (14 dias) de um estádio na lista do registro: o primeiro sempre visível, os demais ao expandir. */
export function UpcomingMatches({ matches }: { matches: UpcomingMatch[] }) {
  const [open, setOpen] = useState(false);
  if (!matches.length) return null;
  const [first, ...rest] = matches;
  const shown = open ? matches : [first];

  return (
    <div className="mt-1 flex flex-col gap-1.5 rounded-lg bg-partida px-3 py-2">
      <p className="rotulo-display flex items-center gap-1 text-[0.7rem] text-estadio">
        <KitIcon name="calendar" size={14} /> {matches.length === 1 ? "Próximo jogo neste estádio" : "Próximos jogos neste estádio"}
      </p>
      <ul className="flex flex-col gap-1">
        {shown.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-tinta">
            <span className="flex min-w-0 items-center gap-1.5 font-semibold text-estadio">
              <TeamCrest team={m.home} size={18} />
              <span className="truncate">{m.home.name}</span>
              <span className="text-suave">×</span>
              <TeamCrest team={m.away} size={18} />
              <span className="truncate">{m.away.name}</span>
            </span>
            <span className="text-xs text-suave">
              {formatKickoff(m.utcDate)} · {m.competition.name}
            </span>
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start text-xs font-semibold text-estadio underline underline-offset-2"
        >
          {open ? "Mostrar menos" : `+${rest.length} ${rest.length === 1 ? "jogo" : "jogos"}`}
        </button>
      )}
    </div>
  );
}
