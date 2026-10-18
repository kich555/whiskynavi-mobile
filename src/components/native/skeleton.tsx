import { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

export type SkeletonVariant =
  | "cards"
  | "rows"
  | "detail"
  | "article"
  | "form"
  | "account"
  | "hero"
  | "media"
  | "inline"
  | "app";
export type SkeletonProps = {
  variant?: SkeletonVariant;
  columns?: number;
  count?: number;
  label?: string;
};
const palette = { bone: "#ffffff16", surface: "#ffffff05", edge: "#ffffff12" };

function Bone({
  width = "100%",
  height = 14,
  style,
}: {
  width?: ViewStyle["width"];
  height?: number;
  style?: ViewStyle;
}) {
  return <View style={[s.bone, { width, height }, style]} />;
}
function Lines() {
  return (
    <View style={s.lines}>
      <Bone width="88%" />
      <Bone />
      <Bone width="64%" />
    </View>
  );
}
function Rows({ count }: { count: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={s.row}>
          <Bone width="28%" height={10} />
          <Bone width={i % 2 ? "72%" : "88%"} height={16} />
          <Bone width="48%" height={10} />
        </View>
      ))}
    </View>
  );
}
function Cards({ columns, count }: { columns: number; count: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: Math.ceil(count / columns) }, (_, row) => (
        <View key={row} style={{ flexDirection: "row", gap: 20 }}>
          {Array.from({ length: columns }, (_, col) => (
            <View
              key={col}
              style={[
                s.card,
                { flex: 1, opacity: row * columns + col < count ? 1 : 0 },
              ]}
            >
              <Bone
                height={undefined}
                style={{ aspectRatio: 1, height: "auto", borderRadius: 0 }}
              />
              <View style={{ padding: 12, gap: 8 }}>
                <Bone width="32%" height={18} />
                <Bone height={18} />
                <Bone width="72%" height={18} />
                <Bone width="60%" height={22} />
                <Bone width="46%" height={12} />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
function Form() {
  return (
    <View style={s.section}>
      <Bone width="56%" height={24} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={s.lines}>
          <Bone width="24%" height={12} />
          <Bone height={52} style={{ borderRadius: 14 }} />
        </View>
      ))}
      <Bone height={48} style={{ borderRadius: 12 }} />
    </View>
  );
}
function Detail() {
  return (
    <View style={s.section}>
      <Bone
        height={undefined}
        style={{
          aspectRatio: 1,
          height: "auto",
          maxWidth: 440,
          alignSelf: "center",
          borderRadius: 20,
        }}
      />
      <Bone width="80%" height={28} />
      <Bone width="44%" height={28} />
      <Lines />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Bone width={undefined} height={48} style={{ flex: 1 }} />
        <Bone width={undefined} height={48} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
function Article() {
  return (
    <View style={s.section}>
      <Bone width="84%" height={28} />
      <Bone width="50%" height={12} />
      <View style={[s.panel, { gap: 24 }]}>
        <Lines />
        <Lines />
        <Lines />
      </View>
      <Bone width="32%" height={20} />
      <Rows count={2} />
    </View>
  );
}
function Account() {
  return (
    <View style={s.section}>
      <View
        style={[
          s.panel,
          { flexDirection: "row", gap: 16, alignItems: "center" },
        ]}
      >
        <Bone width={52} height={52} style={{ borderRadius: 18 }} />
        <View style={{ flex: 1, gap: 10 }}>
          <Bone width="70%" height={22} />
          <Bone width="88%" height={12} />
          <Bone width="32%" height={16} />
        </View>
      </View>
      <Bone width="40%" height={22} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Bone
            key={i}
            width={undefined}
            height={92}
            style={{ flex: 1, borderRadius: 16 }}
          />
        ))}
      </View>
      <Bone width="32%" height={22} />
      <View style={s.panel}>
        <Rows count={3} />
      </View>
    </View>
  );
}

/** Indeterminate busy region; the decorative shapes are never focusable or interactive. */
export function Skeleton({
  variant = "rows",
  columns = 2,
  count = 4,
  label = "불러오는 중",
}: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduceMotion(value);
      })
      .catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const state = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => {
      live = false;
      motion.remove();
      state.remove();
    };
  }, []);
  useEffect(() => {
    opacity.setValue(1);
    if (reduceMotion || !active) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.48,
          duration: 900,
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [active, opacity, reduceMotion]);
  const safeColumns = Math.max(1, Math.min(2, columns));
  const safeCount = Math.max(1, Math.min(6, count));
  return (
    <View
      pointerEvents="none"
      testID={`skeleton-${variant}`}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      aria-busy
      style={{ width: "100%" }}
    >
      <Animated.View
        testID="skeleton-shapes"
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{ opacity }}
      >
        {variant === "cards" ? (
          <Cards columns={safeColumns} count={safeCount} />
        ) : variant === "detail" ? (
          <Detail />
        ) : variant === "article" ? (
          <Article />
        ) : variant === "form" ? (
          <Form />
        ) : variant === "account" ? (
          <Account />
        ) : variant === "hero" ? (
          <View
            style={[s.section, { alignItems: "center", paddingVertical: 24 }]}
          >
            <Bone width="76%" height={28} />
            <Bone width="92%" height={16} />
            <Bone width="54%" height={48} />
          </View>
        ) : variant === "media" ? (
          <Bone height={undefined} style={{ aspectRatio: 1, height: "auto" }} />
        ) : variant === "inline" ? (
          <View style={s.lines}>
            <Bone width="64%" />
            <Bone width="42%" height={10} />
          </View>
        ) : variant === "app" ? (
          <View style={s.section}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Bone width="38%" height={32} />
              <Bone width={48} height={48} />
            </View>
            <Bone height={180} />
            <Rows count={3} />
          </View>
        ) : (
          <Rows count={safeCount} />
        )}
      </Animated.View>
    </View>
  );
}
const s = StyleSheet.create({
  bone: {
    backgroundColor: palette.bone,
    borderRadius: 6,
    borderCurve: "continuous",
  },
  lines: { gap: 8 },
  section: { gap: 20 },
  panel: {
    padding: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.edge,
    borderRadius: 20,
    borderCurve: "continuous",
  },
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.edge,
    backgroundColor: palette.surface,
  },
  row: {
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: palette.edge,
  },
});
