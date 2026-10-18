import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

export const material = {
  fill: "#ffffff0a",
  edge: "#ffffff26",
  highlight: "#ffffff45",
  focus: "#bdd2df",
  pearl: "#e7eef2",
  selected: "#354650",
  shadow: "0 6px 18px rgba(0, 0, 0, 0.14)",
};

// Only floating sheets sample their background. Scrolling controls use cheap reflections.
export function GlassBackdrop() {
  const [opaque, setOpaque] = useState(true);
  useEffect(() => {
    if (Platform.OS === "web") {
      const media = window.matchMedia("(prefers-reduced-transparency: reduce)");
      const update = () => setOpaque(media.matches);
      update();
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    if (Platform.OS !== "ios") return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (active) setOpaque(value);
      })
      .catch(() => {});
    const event = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setOpaque,
    );
    return () => {
      active = false;
      event.remove();
    };
  }, []);
  const webBlur: ViewStyle & { backdropFilter?: string } =
    Platform.OS === "web" && !opaque
      ? { backdropFilter: "blur(24px) saturate(115%)" }
      : {};
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: opaque ? "#28333c" : "#202b34e8" },
        webBlur,
      ]}
    >
      {!opaque &&
      Platform.OS === "ios" &&
      isGlassEffectAPIAvailable() &&
      isLiquidGlassAvailable() ? (
        <GlassView
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor="#35465080"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <LinearGradient
        colors={["#ffffff12", "#ffffff00", "#ffffff03"]}
        locations={[0, 0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
