"use client";

import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import type { VisitDetail } from "@shared/api-types";
import { scoreError, type Sport } from "@shared/sports";
import { Button } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { api, ApiFailure } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { ScoreInput } from "./registro-form";
import { scoreDigits, scoreFieldLabel } from "./sport-bits";
import { Scoreline } from "./team-crest";
import { Kickoff } from "./upcoming-matches";

type Props = Pick<VisitDetail, "id" | "sport" | "home" | "away" | "homeScore" | "awayScore" | "competition" | "prediction" | "result" | "predictionOutcome">;

const SOURCE: Record<string, string> = {
  "football-data": "Resultado: football-data.org",
  "api-football": "Resultado: API-Football",
  "api-basketball": "Resultado: API-Sports (basquete)",
  "api-volleyball": "Resultado: API-Sports (vôlei)",
  manual: "Resultado informado por você",
};

const noSubscribe = () => () => {};

/** Já passou do fim previsto? (no servidor e na hidratação vale "não": evita divergência) */
function useEnded(expectedEndAt: string | null) {
  return useSyncExternalStore(
    noSubscribe,
    () => (expectedEndAt ? Date.now() >= new Date(expectedEndAt).getTime() : true),
    () => false,
  );
}

/** Placar do carimbo de partida: pendente (palpite, fim previsto, informar resultado) ou final (palpite × resultado). */
export function ResultPanel({ visit: v }: { visit: Props }) {
  const pending = v.result?.status === "pending";
  const ended = useEnded(v.result?.expectedEndAt ?? null);
  const [form, setForm] = useState<"result" | "prediction" | null>(null);

  return (
    <section aria-label="Resultado" className="flex flex-col gap-4 rounded-2xl border border-linha bg-white p-4 lg:p-6">
      <Scoreline home={v.home} away={v.away} homeScore={v.homeScore} awayScore={v.awayScore} size="lg" />
      {v.competition && <p className="-mt-2 text-center text-suave">{v.competition}</p>}

      {pending && (
        <p role="status" className="flex items-start justify-center gap-2 rounded-lg bg-partida px-3 py-2 text-center text-sm text-tinta">
          <KitIcon name="calendar" size={18} className="mt-0.5 shrink-0" />
          <span>
            {v.result?.needsManual && !ended && v.result.expectedEndAt ? (
              <>
                Resultado por volta de <Kickoff utcDate={v.result.expectedEndAt} />. Este jogo não tem busca automática: informe o placar quando acabar.
              </>
            ) : v.result?.needsManual ? (
              "Não conseguimos buscar o resultado automaticamente. Informe o placar abaixo."
            ) : ended ? (
              "O jogo já deve ter terminado: buscando o resultado. Ele aparece aqui assim que a fonte publicar."
            ) : v.result?.expectedEndAt ? (
              <>
                Aguardando o fim do jogo · resultado por volta de <Kickoff utcDate={v.result.expectedEndAt} />
              </>
            ) : (
              "Aguardando o resultado."
            )}
          </span>
        </p>
      )}

      {v.prediction && <PredictionLine visit={v} />}

      {form ? (
        <ScoreForm
          visitId={v.id}
          sport={v.sport}
          kind={form}
          initial={form === "prediction" ? v.prediction : v.homeScore != null && v.awayScore != null ? { home: v.homeScore, away: v.awayScore } : null}
          onClose={() => setForm(null)}
        />
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {pending && (
            <>
              <Button type="button" onClick={() => setForm("result")}>
                Informar resultado
              </Button>
              <Button type="button" variant="secundario" onClick={() => setForm("prediction")}>
                {v.prediction ? "Editar palpite" : "Dar um palpite"}
              </Button>
            </>
          )}
          {!pending && (
            <button type="button" onClick={() => setForm("result")} className="text-sm font-semibold text-estadio underline underline-offset-4">
              Corrigir resultado
            </button>
          )}
        </div>
      )}

      {!pending && v.result?.source && <p className="text-center text-xs text-suave">{SOURCE[v.result.source]}</p>}
    </section>
  );
}

function PredictionLine({ visit: v }: { visit: Props }) {
  const draw = v.homeScore != null && v.homeScore === v.awayScore;
  const outcome =
    v.predictionOutcome === "exact"
      ? { text: "Na mosca! Acertou o placar", tone: "bg-visita" }
      : v.predictionOutcome === "winner"
        ? { text: draw ? "Acertou o empate" : "Acertou o vencedor", tone: "bg-partida" }
        : v.predictionOutcome === "miss"
          ? { text: "Errou o palpite", tone: "bg-marfim" }
          : null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-tinta">
      <span>
        Seu palpite:{" "}
        <strong className="titulo-display text-xl tabular-nums text-estadio">
          {v.prediction!.home} × {v.prediction!.away}
        </strong>
      </span>
      {outcome && <span className={cn("rotulo-display rounded-md px-2 py-0.5 text-sm text-estadio", outcome.tone)}>{outcome.text}</span>}
    </div>
  );
}

function ScoreForm({
  visitId,
  sport,
  kind,
  initial,
  onClose,
}: {
  visitId: string;
  sport: Sport;
  kind: "result" | "prediction";
  initial: { home: number; away: number } | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [home, setHome] = useState(initial ? String(initial.home) : "");
  const [away, setAway] = useState(initial ? String(initial.away) : "");
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const label = kind === "result" ? "Resultado" : "Palpite";

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{1,3}$/.test(home) || !/^\d{1,3}$/.test(away)) {
      setState({ busy: false, error: sport === "volei" ? "Informe os sets dos dois times (ex.: 3 e 1)." : "Informe o placar dos dois times (ex.: 2 e 1)." });
      return;
    }
    const invalid = scoreError(sport, Number(home), Number(away));
    if (invalid) {
      setState({ busy: false, error: invalid });
      return;
    }
    setState({ busy: true, error: null });
    try {
      const json =
        kind === "result"
          ? { homeScore: Number(home), awayScore: Number(away) }
          : { predictedHomeScore: Number(home), predictedAwayScore: Number(away) };
      await api(`/api/visits/${visitId}/${kind}`, { method: "PATCH", json });
      onClose();
      router.refresh();
    } catch (error) {
      setState({ busy: false, error: error instanceof ApiFailure ? error.message : "Não foi possível salvar." });
    }
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col items-center gap-3 rounded-xl border border-linha p-4">
      <p className="font-semibold text-estadio">{kind === "result" ? "Informar resultado" : "Seu palpite"}</p>
      <div className="flex items-center gap-3">
        <ScoreInput
          label={`${label}: ${scoreFieldLabel(sport, "home").toLowerCase()}`}
          digits={scoreDigits(sport)}
          value={home}
          onChange={setHome}
          invalid={!!state.error}
        />
        <span className="font-display text-2xl text-suave">×</span>
        <ScoreInput
          label={`${label}: ${scoreFieldLabel(sport, "away").toLowerCase()}`}
          digits={scoreDigits(sport)}
          value={away}
          onChange={setAway}
          invalid={!!state.error}
        />
      </div>
      {kind === "result" && <p className="text-center text-xs text-suave">O resultado informado vale sobre a busca automática.</p>}
      {state.error && (
        <p role="alert" className="text-sm text-erro">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="secundario" onClick={onClose} disabled={state.busy}>
          Cancelar
        </Button>
        <Button type="submit" disabled={state.busy}>
          {state.busy ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
