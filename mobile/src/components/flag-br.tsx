import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Bandeira do Brasil (mesmo desenho do web). */
export function FlagBR() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg viewBox="0 0 28 20" width={28} height={20}>
        <Rect width="28" height="20" rx="3" fill="#009C3B" />
        <Path d="M14 3 25 10 14 17 3 10z" fill="#FFDF00" />
        <Circle cx="14" cy="10" r="4.2" fill="#002776" />
      </Svg>
    </View>
  );
}
