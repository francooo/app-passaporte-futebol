import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TeamRef } from "@shared/api-types";
import type { Sport } from "@shared/sports";
import { SPORT_COPY } from "@shared/sport-copy";
import { useAuth } from "@/lib/auth-context";
import { visitsApi } from "@/lib/visits";
import { colors, font, radius, type } from "@/theme";
import { TeamCrest } from "./visit-bits";

export type ManualTeam = { id: string | null; name: string; crestUrl: string | null };

/** Time com sugestões do catálogo; texto livre cria um time novo (vai para moderação). */
export function TeamInput({
  label,
  value,
  onChange,
  error,
  sport,
}: {
  label: string;
  value: ManualTeam;
  onChange: (t: ManualTeam) => void;
  error?: string;
  /** Só times desse esporte ("Minas" do vôlei ≠ "Minas" do basquete). */
  sport?: Sport;
}) {
  const { token } = useAuth();
  const [options, setOptions] = useState<TeamRef[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const q = value.name.trim();
    if (value.id || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      visitsApi(token).searchTeams(q, controller.signal, sport).then(setOptions, () => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, value.name, value.id, sport]);

  const show = focused && !value.id && value.name.trim().length >= 2 && options.length > 0;

  return (
    <View style={styles.gapSm}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.searchBox, !!error && { borderColor: colors.erro }]}>
        <TeamCrest team={value.id ? value : null} size={26} />
        <TextInput
          value={value.name}
          onChangeText={(name) => onChange({ id: null, name, crestUrl: null })}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={SPORT_COPY[sport ?? "futebol"].teamExample}
          placeholderTextColor={colors.suave}
          accessibilityLabel={label}
          maxLength={80}
          style={styles.searchInput}
        />
      </View>
      {show && (
        <View style={styles.options}>
          {options.map((t) => (
            <Pressable
              key={t.id ?? t.name}
              onPress={() => {
                onChange({ id: t.id, name: t.name, crestUrl: t.crestUrl });
                setFocused(false);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.partida }]}
            >
              <TeamCrest team={t} size={24} />
              <Text style={type.corpo}>{t.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  gapSm: { gap: 4 },
  label: { fontFamily: font.sansSemi, fontSize: 14, color: colors.estadio },
  searchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 12, fontFamily: font.sans, fontSize: 16, color: colors.tinta },
  options: { borderRadius: radius.campo, borderWidth: 1, borderColor: colors.linha, backgroundColor: colors.branco, overflow: "hidden" },
  option: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, minHeight: 44 },
  error: { fontFamily: font.sans, fontSize: 14, color: colors.erro },
});
