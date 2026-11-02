import { useId } from "react";
import { View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Image, Path, Rect, Text, TextPath } from "react-native-svg";
import { colors, font } from "@/theme";

type Props = {
  name: string;
  place: string;
  photo?: ImageSourcePropType | null;
  /** Cor do carimbo como código de coleção; o tipo é sempre escrito ao lado. */
  tone?: "verde" | "azul";
  size?: number;
  style?: StyleProp<ViewStyle>;
};

const tones = { verde: colors.estadio, azul: colors.carimboAzul };

/** Selo circular com o estádio no arco superior e o local no inferior (porta o Stamp do web). */
export function Stamp({ name, place, photo, tone = "verde", size = 80, style }: Props) {
  const color = tones[tone];
  const uid = `stamp${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <View
      style={[{ transform: [{ rotate: "-3deg" }] }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Carimbo ${name}, ${place}`}
    >
      <Svg viewBox="0 0 120 120" width={size} height={size}>
        <Defs>
          <Path id={`${uid}top`} d="M 20,60 A 40,40 0 0 1 100,60" />
          <Path id={`${uid}bottom`} d="M 11,60 A 49,49 0 0 0 109,60" />
          <ClipPath id={`${uid}clip`}>
            <Circle cx="60" cy="60" r="30" />
          </ClipPath>
        </Defs>
        <Circle cx="60" cy="60" r="57" fill={colors.marfim} stroke={color} strokeWidth="3" />
        <Circle cx="60" cy="60" r="35" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 3" />
        {photo ? (
          <Image
            href={photo}
            x="30"
            y="30"
            width="60"
            height="60"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${uid}clip)`}
          />
        ) : (
          <G clipPath={`url(#${uid}clip)`}>
            <Rect x="30" y="30" width="60" height="60" fill={colors.partida} />
            <Path d="M42 66 60 56l18 10v12H42z" fill={colors.ingresso} stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <Path d="M46 70h28M50 70v8m10-8v8m10-8v8" stroke={color} strokeWidth="1.6" />
          </G>
        )}
        <Text fill={color} fontSize="10" letterSpacing="1" fontFamily={font.display}>
          <TextPath href={`#${uid}top`} startOffset="50%" textAnchor="middle">
            {name.toUpperCase()}
          </TextPath>
        </Text>
        <Text fill={color} fontSize="9" letterSpacing="1" fontFamily={font.display}>
          <TextPath href={`#${uid}bottom`} startOffset="50%" textAnchor="middle">
            {place.toUpperCase()}
          </TextPath>
        </Text>
        <Text x="15" y="63" fill={color} fontSize="8" textAnchor="middle">
          ★
        </Text>
        <Text x="105" y="63" fill={color} fontSize="8" textAnchor="middle">
          ★
        </Text>
      </Svg>
    </View>
  );
}
