import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/button";
import { KitIcon } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { StampCard } from "@/components/stamp-card";
import { BittenCard, PerforatedFrame } from "@/components/ticket";
import { demoVisits } from "@/lib/demo-data";
import { colors, font, type } from "@/theme";

export default function PassaporteScreen() {
  const stamps = demoVisits.length;
  const stadiums = new Set(demoVisits.map((v) => v.stadium)).size;

  return (
    <Screen>
      <View>
        <Text style={[type.titulo, styles.title]} accessibilityRole="header">
          Meu Passaporte
        </Text>
        <Text style={styles.subtitle}>Suas visitas, suas histórias.</Text>
      </View>

      <PerforatedFrame bleed style={styles.frame}>
        <BittenCard style={styles.counters}>
          <Counter value={stamps} label="carimbos" divider />
          <Counter value={stadiums} label="estádios" />
        </BittenCard>

        {demoVisits.map((v) => (
          <StampCard
            key={v.id}
            stadium={v.stadium}
            city={v.city}
            stateCode={v.stateCode}
            kind={v.kind}
            date={v.date}
            photo={v.photo}
            tone={v.tone}
          />
        ))}

        <Button icon={<KitIcon name="camera-ai" size={30} />} style={styles.add}>
          Adicionar carimbo
        </Button>
      </PerforatedFrame>
    </Screen>
  );
}

function Counter({ value, label, divider }: { value: number; label: string; divider?: boolean }) {
  return (
    <View style={[styles.counter, divider && styles.counterDivider]} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[type.titulo, styles.counterValue]}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 46 },
  subtitle: { fontFamily: font.displayMedium, fontSize: 20, letterSpacing: 0.4, color: colors.tinta, marginTop: 2 },
  frame: { gap: 12, paddingVertical: 16, paddingHorizontal: 20 },
  counters: { flexDirection: "row", paddingVertical: 16 },
  counter: { flex: 1, flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 8 },
  counterDivider: { borderRightWidth: 1, borderRightColor: colors.linha },
  counterValue: { fontSize: 46 },
  counterLabel: { fontFamily: font.displayMedium, fontSize: 20, color: colors.estadio },
  add: { borderWidth: 2, borderColor: colors.ingressoEscuro },
});
