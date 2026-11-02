import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, font } from "@/theme";
import { KitIcon, type KitIconName } from "./kit-icon";

/** Mesma ordem e ícones da navegação v05 do web (src/components/ui/nav-items.ts). */
const tabs: Record<string, { label: string; icon: KitIconName }> = {
  home: { label: "Home", icon: "home" },
  mapa: { label: "Mapa", icon: "map" },
  passaporte: { label: "Passaporte", icon: "passport" },
  perfil: { label: "Perfil", icon: "profile" },
};

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Barra inferior com o sublinhado amarelo na aba ativa (equivale ao BottomNav do web). */
export function TabBar({ state, emitter, navigateToTab, insets }: TabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const active = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => {
              const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <KitIcon name={tab.icon} size={26} style={{ opacity: active ? 1 : 0.8 }} />
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active && <View style={styles.indicator} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.navFundo,
    borderTopWidth: 2,
    borderTopColor: colors.navBorda,
    shadowColor: colors.estadio,
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  item: { flex: 1, minHeight: 64, alignItems: "center", justifyContent: "center", gap: 4 },
  label: { fontFamily: font.sansBold, fontSize: 12, color: colors.suave },
  labelActive: { color: colors.estadio },
  indicator: {
    position: "absolute",
    bottom: 4,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ingresso,
  },
});
