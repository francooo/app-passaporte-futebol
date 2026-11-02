import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/button";
import { KitIcon, type KitIconName } from "@/components/kit-icon";
import { Screen } from "@/components/screen";
import { useAuth } from "@/lib/auth-context";
import { colors, font, radius, type } from "@/theme";

const sections: Array<{ title: string; description: string; icon: KitIconName }> = [
  { title: "Dados pessoais", description: "Nome, foto, bio, nacionalidade e estado.", icon: "profile" },
  { title: "Time do coração", description: "Escolha seu clube ou seleção.", icon: "crest-stamp" },
  { title: "Idioma", description: "Português, Español ou English.", icon: "map" },
  { title: "Privacidade", description: "Defina quem pode ver suas visitas.", icon: "lock" },
];

export default function PerfilScreen() {
  const { user, signOut } = useAuth();
  const [leaving, setLeaving] = useState(false);

  return (
    <Screen>
      <Text style={[type.titulo, styles.title]} accessibilityRole="header">
        Perfil
      </Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          {user?.image ? <Image source={{ uri: user.image }} style={StyleSheet.absoluteFill} /> : <KitIcon name="profile" size={36} />}
        </View>
        <View style={styles.flex}>
          <Text style={[type.titulo, styles.name]} numberOfLines={1}>
            {user?.name ?? "Torcedor"}
          </Text>
          <Text style={type.suave} numberOfLines={1}>
            {user?.email}
          </Text>
          <Text style={[type.rotulo, styles.plan]}>{user?.premium ? "Premium" : "Plano gratuito"}</Text>
        </View>
      </View>

      <Text style={[type.titulo, styles.subtitle]} accessibilityRole="header">
        Configurações
      </Text>
      <View style={styles.list}>
        {sections.map((s) => (
          <View key={s.title} style={styles.item}>
            <View style={styles.itemIcon}>
              <KitIcon name={s.icon} size={26} />
            </View>
            <View style={styles.flex}>
              <Text style={[type.titulo, styles.itemTitle]}>{s.title}</Text>
              <Text style={type.suave}>{s.description}</Text>
              <Text style={[type.rotulo, styles.soon]}>Em breve</Text>
            </View>
          </View>
        ))}
      </View>

      <Button
        variant="secundario"
        loading={leaving}
        onPress={async () => {
          setLeaving(true);
          await signOut();
        }}
      >
        Sair
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  title: { fontSize: 36 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.papel,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.estadio,
    backgroundColor: colors.partida,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  name: { fontSize: 24 },
  plan: {
    alignSelf: "flex-start",
    marginTop: 8,
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.visita,
    overflow: "hidden",
  },
  subtitle: { fontSize: 24 },
  list: { gap: 12 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    padding: 16,
    borderRadius: radius.cartao,
    borderWidth: 1,
    borderColor: colors.linha,
    backgroundColor: colors.branco,
  },
  itemIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.partida, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 20 },
  soon: { fontSize: 11, color: colors.suave, marginTop: 6 },
});
