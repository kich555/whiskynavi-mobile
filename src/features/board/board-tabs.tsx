import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  Platform,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { colors } from "@/components/native/ui";
export type BoardTab = "community" | "news";

export function BoardTabs({
  value,
  onChange,
}: {
  value: BoardTab;
  onChange: (value: BoardTab) => void;
}) {
  const [layouts, setLayouts] = useState<
    Partial<Record<BoardTab, { x: number; width: number }>>
  >({});
  const [reduced, setReduced] = useState(true);
  const [focused, setFocused] = useState<BoardTab>();
  const [x] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0));
  const initialized = useRef(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  const target = layouts[value];
  const firstWidth = layouts.community?.width ?? 0;
  useEffect(() => {
    if (!target) return;
    const position = value === "news" ? firstWidth + 12 : 0;
    if (!initialized.current || reduced) {
      x.stopAnimation();
      scale.stopAnimation();
      x.setValue(position);
      scale.setValue(target.width / 100);
      initialized.current = true;
      return;
    }
    const animation = Animated.parallel([
      Animated.timing(x, {
        toValue: position,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }),
      Animated.timing(scale, {
        toValue: target.width / 100,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [target, reduced, x, scale, value, firstWidth]);
  return (
    <View accessibilityRole="tablist" style={tabs.row}>
      {(
        [
          ["community", "커뮤니티"],
          ["news", "소식"],
        ] as const
      ).map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityLabel={label}
          accessibilityState={{ selected: value === key }}
          aria-selected={value === key}
          onLayout={({ nativeEvent: { layout } }) =>
            setLayouts((current) =>
              current[key]?.x === layout.x &&
              current[key]?.width === layout.width
                ? current
                : { ...current, [key]: { x: layout.x, width: layout.width } },
            )
          }
          onPress={() => onChange(key)}
          onFocus={(event) => {
            if (
              Platform.OS !== "web" ||
              (
                event.currentTarget as unknown as {
                  matches: (selector: string) => boolean;
                }
              ).matches(":focus-visible")
            )
              setFocused(key);
          }}
          onBlur={() => setFocused(undefined)}
          style={({ pressed }) => [
            tabs.tab,
            { opacity: pressed ? 0.72 : 1 },
            focused === key
              ? {
                  outlineColor: colors.text,
                  outlineWidth: 2,
                  outlineStyle: "solid",
                }
              : null,
          ]}
        >
          <Text
            style={[
              tabs.text,
              { color: value === key ? colors.text : colors.muted },
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: 100,
          height: 2,
          opacity: target ? 1 : 0,
          transform: [{ translateX: x }],
        }}
      >
        <Animated.View
          testID="board-tab-indicator"
          style={[
            tabs.indicator,
            { transformOrigin: "left center", transform: [{ scaleX: scale }] },
          ]}
        />
      </Animated.View>
    </View>
  );
}
const tabs = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    alignSelf: "flex-start",
    position: "relative",
  },
  tab: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: "NaviSansMedium", fontSize: 14, lineHeight: 24 },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 100,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.text,
  },
});
