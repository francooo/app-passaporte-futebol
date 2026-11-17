import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { visitsApi } from "@/lib/visits";
import { colors, font, radius } from "@/theme";
import { Button } from "./button";
import { TeamInput, type ManualTeam } from "./team-input";
import { TextField } from "./text-field";

/** Cidade onde mora (base dos km viajados) e time do coração (padrão do "Desempenho do seu time"). */
export function ProfileSettings() {
  const { token } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [city, setCity] = useState("");
  const [team, setTeam] = useState<ManualTeam>({ id: null, name: "", crestUrl: null });
  const [state, setState] = useState<{ busy: boolean; ok: string | null; errors: Record<string, string> }>({ busy: false, ok: null, errors: {} });

  useEffect(() => {
    visitsApi(token)
      .profile()
      .then(
        (p) => {
          setCity(p.homeCity ?? "");
          if (p.favoriteTeam) setTeam({ id: p.favoriteTeam.id, name: p.favoriteTeam.name, crestUrl: p.favoriteTeam.crestUrl });
        },
        () => {},
      )
      .finally(() => setLoaded(true));
  }, [token]);

  async function save() {
    if (team.name.trim() && !team.id) {
      setState({ busy: false, ok: null, errors: { favoriteTeamId: "Escolha o time na lista de sugestões." } });
      return;
    }
    setState({ busy: true, ok: null, errors: {} });
    try {
      const saved = await visitsApi(token).updateProfile({ homeCity: city.trim() || null, favoriteTeamId: team.name.trim() ? team.id : null });
      setCity(saved.homeCity ?? "");
      setState({ busy: false, ok: "Perfil salvo.", errors: {} });
    } catch (error) {
      const fields = error instanceof ApiRequestError ? (error.body.fields ?? {}) : {};
      setState({
        busy: false,
        ok: null,
        errors: {
          homeCity: fields.homeCity?.[0] ?? "",
          favoriteTeamId: fields.favoriteTeamId?.[0] ?? "",
          form: Object.keys(fields).length ? "" : (error as Error).message,
        },
      });
    }
  }

  if (!loaded) return <ActivityIndicator color={colors.estadio} />;

  return (
    <View style={styles.box}>
      <TextField
        label="Cidade onde você mora"
        icon="location-pin"
        value={city}
        onChangeText={setCity}
        placeholder="Ex.: Belo Horizonte, MG"
        maxLength={120}
        error={state.errors.homeCity || undefined}
        hint="Usada só para calcular os km viajados nas Estatísticas."
      />
      <TeamInput label="Time do coração" value={team} onChange={setTeam} error={state.errors.favoriteTeamId || undefined} />
      {state.ok && (
        <Text style={styles.ok} accessibilityLiveRegion="polite">
          {state.ok}
        </Text>
      )}
      {state.errors.form ? <Text style={styles.error}>{state.errors.form}</Text> : null}
      <Button loading={state.busy} onPress={save}>
        Salvar
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 14, padding: 16, borderRadius: radius.cartao, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco },
  ok: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  error: { fontFamily: font.sans, fontSize: 14, color: colors.erro },
});
