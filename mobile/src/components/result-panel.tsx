import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { VisitDetail } from "@shared/api-types";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { visitsApi } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";
import { Button } from "./button";
import { KitIcon } from "./kit-icon";
import { scoreDigits, scoreFieldLabel } from "@shared/sport-copy";
import { scoreError, type Sport } from "@shared/sports";
import { ScoreInput } from "./score-input";
import { formatKickoff } from "./upcoming-matches";
import { Scoreline } from "./visit-bits";

const SOURCE: Record<string, string> = {
  "football-data": "Resultado: football-data.org",
  "api-football": "Resultado: API-Football",
  "api-basketball": "Resultado: API-Sports (basquete)",
  "api-volleyball": "Resultado: API-Sports (vôlei)",
  manual: "Resultado informado por você",
};

/** Placar do carimbo de partida (igual ao web): pendente (palpite, fim previsto, informar resultado) ou final (palpite × resultado). */
export function ResultPanel({ visit: v, onChanged }: { visit: VisitDetail; onChanged: () => void }) {
  const pending = v.result?.status === "pending";
  const ended = v.result?.expectedEndAt ? Date.now() >= new Date(v.result.expectedEndAt).getTime() : true;
  const [form, setForm] = useState<"result" | "prediction" | null>(null);

  const status =
    v.result?.needsManual && !ended && v.result.expectedEndAt
      ? `Resultado por volta de ${formatKickoff(v.result.expectedEndAt)}. Este jogo não tem busca automática: informe o placar quando acabar.`
      : v.result?.needsManual
    ? "Não conseguimos buscar o resultado automaticamente. Informe o placar abaixo."
    : ended
      ? "O jogo já deve ter terminado: buscando o resultado. Ele aparece aqui assim que a fonte publicar."
      : v.result?.expectedEndAt
        ? `Aguardando o fim do jogo · resultado por volta de ${formatKickoff(v.result.expectedEndAt)}`
        : "Aguardando o resultado.";

  return (
    <View style={styles.box}>
      <Scoreline home={v.home} away={v.away} homeScore={v.homeScore} awayScore={v.awayScore} size={52} />
      {v.competition && <Text style={[type.suave, styles.center]}>{v.competition}</Text>}

      {pending && (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <KitIcon name="calendar" size={16} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}

      {v.prediction && <PredictionLine visit={v} />}

      {form ? (
        <ScoreForm
          visitId={v.id}
          sport={v.sport}
          kind={form}
          initial={form === "prediction" ? v.prediction : v.homeScore != null && v.awayScore != null ? { home: v.homeScore, away: v.awayScore } : null}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            onChanged();
          }}
        />
      ) : pending ? (
        <View style={styles.actions}>
          <Button onPress={() => setForm("result")}>Informar resultado</Button>
          <Button variant="secundario" onPress={() => setForm("prediction")}>
            {v.prediction ? "Editar palpite" : "Dar um palpite"}
          </Button>
        </View>
      ) : (
        <Pressable onPress={() => setForm("result")} accessibilityRole="button" hitSlop={8} style={styles.fix}>
          <Text style={styles.link}>Corrigir resultado</Text>
        </Pressable>
      )}

      {!pending && v.result?.source && <Text style={[type.suave, styles.small, styles.center]}>{SOURCE[v.result.source]}</Text>}
    </View>
  );
}

function PredictionLine({ visit: v }: { visit: VisitDetail }) {
  const draw = v.homeScore != null && v.homeScore === v.awayScore;
  const outcome =
    v.predictionOutcome === "exact"
      ? { text: "Na mosca! Acertou o placar", bg: colors.visita }
      : v.predictionOutcome === "winner"
        ? { text: draw ? "Acertou o empate" : "Acertou o vencedor", bg: colors.partida }
        : v.predictionOutcome === "miss"
          ? { text: "Errou o palpite", bg: colors.marfim }
          : null;
  return (
    <View style={styles.prediction}>
      <Text style={type.corpo}>
        Seu palpite:{" "}
        <Text style={styles.predictionScore}>
          {v.prediction!.home} × {v.prediction!.away}
        </Text>
      </Text>
      {outcome && <Text style={[type.rotulo, styles.outcome, { backgroundColor: outcome.bg }]}>{outcome.text}</Text>}
    </View>
  );
}

function ScoreForm({
  visitId,
  sport,
  kind,
  initial,
  onClose,
  onSaved,
}: {
  visitId: string;
  sport: Sport;
  kind: "result" | "prediction";
  initial: { home: number; away: number } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAuth();
  const [home, setHome] = useState(initial ? String(initial.home) : "");
  const [away, setAway] = useState(initial ? String(initial.away) : "");
  const [state, setState] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const label = kind === "result" ? "Resultado" : "Palpite";

  async function save() {
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
      const api = visitsApi(token);
      if (kind === "result") await api.setResult(visitId, { homeScore: Number(home), awayScore: Number(away) });
      else await api.setPrediction(visitId, { predictedHomeScore: Number(home), predictedAwayScore: Number(away) });
      onSaved();
    } catch (error) {
      setState({ busy: false, error: error instanceof ApiRequestError ? error.message : "Não foi possível salvar." });
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.formTitle}>{kind === "result" ? "Informar resultado" : "Seu palpite"}</Text>
      <View style={styles.scoreRow}>
        <ScoreInput
          label={`${label}: ${scoreFieldLabel(sport, "home").toLowerCase()}`}
          digits={scoreDigits(sport)}
          value={home}
          onChange={setHome}
          invalid={!!state.error}
        />
        <Text style={styles.times}>×</Text>
        <ScoreInput
          label={`${label}: ${scoreFieldLabel(sport, "away").toLowerCase()}`}
          digits={scoreDigits(sport)}
          value={away}
          onChange={setAway}
          invalid={!!state.error}
        />
      </View>
      {kind === "result" && <Text style={[type.suave, styles.small, styles.center]}>O resultado informado vale sobre a busca automática.</Text>}
      {state.error && <Text style={styles.error}>{state.error}</Text>}
      <View style={styles.actions}>
        <Button variant="secundario" onPress={onClose} disabled={state.busy}>
          Cancelar
        </Button>
        <Button onPress={save} loading={state.busy}>
          Salvar
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, padding: 14, borderRadius: radius.cartao, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  center: { textAlign: "center" },
  small: { fontSize: 12 },
  status: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 8, backgroundColor: colors.partida },
  statusText: { flex: 1, fontFamily: font.sans, fontSize: 14, color: colors.tinta },
  prediction: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 },
  predictionScore: { fontFamily: font.display, fontSize: 20, color: colors.estadio },
  outcome: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  actions: { gap: 8 },
  fix: { alignSelf: "center", minHeight: 44, justifyContent: "center" },
  link: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio, textDecorationLine: "underline" },
  form: { gap: 10, padding: 12, borderRadius: radius.campo, borderWidth: 1, borderColor: colors.linha },
  formTitle: { fontFamily: font.sansSemi, fontSize: 15, color: colors.estadio, textAlign: "center" },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  times: { fontFamily: font.display, fontSize: 24, color: colors.suave },
  error: { fontFamily: font.sans, fontSize: 14, color: colors.erro, textAlign: "center" },
});
