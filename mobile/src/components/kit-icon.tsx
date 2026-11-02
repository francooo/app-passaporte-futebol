import { View, type StyleProp, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { kitIcons, type KitIconName } from "@/generated/kit-icons";

export type { KitIconName };

type Props = {
  name: KitIconName;
  size?: number;
  /** Para ícones não quadrados (ex.: football-postmark, 220×100). */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Ícones SVG do kit v05 (mesmos arquivos de public/icons do web). Decorativos para leitores de tela. */
export function KitIcon({ name, size = 24, width, height, style }: Props) {
  return (
    <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml xml={kitIcons[name]} width={width ?? size} height={height ?? size} />
    </View>
  );
}
