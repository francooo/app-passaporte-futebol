import { Image, View } from "react-native";
import { SvgUri } from "react-native-svg";
import type { TeamRef } from "@shared/api-types";
import { remoteImage } from "@/lib/remote-image";
import { KitIcon } from "./kit-icon";

/** Escudo do time: os do football-data costumam ser SVG (o Image do RN não desenha SVG). */
export function TeamCrest({ team, size = 40 }: { team: Pick<TeamRef, "crestUrl"> | null; size?: number }) {
  const url = team?.crestUrl;
  if (!url) return <KitIcon name="crest-stamp" size={size} />;
  if (/\.svg(\?|$)/i.test(url)) {
    return (
      <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SvgUri uri={url} width={size} height={size} />
      </View>
    );
  }
  return <Image source={remoteImage(url)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}
