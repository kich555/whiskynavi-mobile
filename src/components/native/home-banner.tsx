import type { UserBannerResponse } from "@/apis/generated/api";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Action, Label, Loading, go, styles } from "./ui";

const INTERVAL = 5000;
export function HomeBanner({
  banners,
  loading,
  error,
  retry,
}: {
  banners: UserBannerResponse[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const previousWidth = useRef(0);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const touching = useRef(false);
  useEffect(() => () => clearTimeout(scrollTimer.current), []);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [revision, restart] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [motionAllowed, setMotionAllowed] = useState(false);
  const { height } = useWindowDimensions();
  const count = banners.length;
  const current = Math.min(index, Math.max(0, count - 1));
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const app = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    if (Platform.OS === "web") {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => setMotionAllowed(!media.matches);
      update();
      media.addEventListener("change", update);
      return () => {
        app.remove();
        media.removeEventListener("change", update);
      };
    }
    let alive = true,
      reduced = true,
      reader = true;
    const update = () => {
      if (alive) setMotionAllowed(!reduced && !reader);
    };
    void Promise.all([
      AccessibilityInfo.isReduceMotionEnabled(),
      AccessibilityInfo.isScreenReaderEnabled(),
    ])
      .then(([r, s]) => {
        reduced = r;
        reader = s;
        update();
      })
      .catch(() => {});
    const m = AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => {
      reduced = v;
      update();
    });
    const s = AccessibilityInfo.addEventListener("screenReaderChanged", (v) => {
      reader = v;
      update();
    });
    return () => {
      alive = false;
      app.remove();
      m.remove();
      s.remove();
    };
  }, []);
  const select = useCallback(
    (next: number, animate = true) => {
      setIndex(next);
      restart((n) => n + 1);
      scroll.current?.scrollTo({
        x: next * width,
        animated: animate && motionAllowed,
      });
    },
    [width, motionAllowed],
  );
  // A fresh timeout starts after every settled swipe or dot selection, even on the same dot.
  useEffect(() => {
    if (
      count < 2 ||
      !width ||
      !focused ||
      !active ||
      !motionAllowed ||
      interacting
    )
      return;
    const timer = setTimeout(
      () => select((current + 1) % count, current < count - 1),
      INTERVAL,
    );
    return () => clearTimeout(timer);
  }, [
    count,
    width,
    focused,
    active,
    motionAllowed,
    interacting,
    current,
    revision,
    select,
  ]);
  useEffect(() => {
    if (previousWidth.current !== width) {
      scroll.current?.scrollTo({ x: current * width, animated: false });
      previousWidth.current = width;
    }
  }, [width, current]);
  const settleOffset = (offset: number) => {
    if (!width) return;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(offset / width))));
    setInteracting(touching.current);
    restart((n) => n + 1);
  };
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    settleOffset(event.nativeEvent.contentOffset.x);
  const slides: (UserBannerResponse | undefined)[] = count
    ? banners
    : [undefined];
  return (
    <View
      testID="home-banner"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        directionalLockEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEnabled={count > 1}
        testID="home-banner-scroll"
        scrollEventThrottle={16}
        onScroll={(event) => {
          setInteracting(true);
          clearTimeout(scrollTimer.current);
          const offset = event.nativeEvent.contentOffset.x;
          scrollTimer.current = setTimeout(() => settleOffset(offset), 150);
        }}
        onScrollBeginDrag={() => setInteracting(true)}
        onScrollEndDrag={settle}
        onMomentumScrollEnd={settle}
        onTouchStart={() => {
          touching.current = true;
          setInteracting(true);
        }}
        onTouchEnd={() => {
          touching.current = false;
          setInteracting(false);
          restart((n) => n + 1);
        }}
        onTouchCancel={() => {
          touching.current = false;
          setInteracting(false);
          restart((n) => n + 1);
        }}
      >
        {slides.map((banner, i) => (
          <View
            key={banner?.id ?? "fallback"}
            testID={i === current ? "active-home-banner" : undefined}
            accessibilityElementsHidden={i !== current}
            importantForAccessibility={
              i === current ? "auto" : "no-hide-descendants"
            }
            aria-hidden={i !== current}
            style={{
              width: width || 1,
              minHeight: Math.max(440, Math.min(620, height - 220)),
              paddingVertical: 96,
              paddingHorizontal: 24,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Image
              source={
                banner?.backgroundUrl
                  ? { uri: banner.backgroundUrl }
                  : require("../../../assets/brand/bg-sample.png")
              }
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "#00000080" },
              ]}
            />
            {loading ? (
              <Loading variant="hero" />
            ) : (
              <View style={{ alignItems: "center", gap: 12 }}>
                <Text
                  style={{
                    fontFamily: "NaviSansMedium",
                    fontSize: 20,
                    lineHeight: 28,
                    textAlign: "center",
                    color: "white",
                  }}
                >
                  {banner?.title ?? "위스키를 탐험하는 새로운 방법"}
                </Text>
                {banner?.description ? (
                  <Text
                    style={[
                      styles.text,
                      { textAlign: "center", color: "#ffffffe6" },
                    ]}
                  >
                    {banner.description}
                  </Text>
                ) : null}
                {banner ? (
                  <Action
                    title="자세히 보기"
                    onPress={() => {
                      if (
                        banner.link?.startsWith("/") &&
                        !banner.link.startsWith("//")
                      )
                        go(banner.link);
                      else if (/^https:\/\//.test(banner.link ?? ""))
                        void Linking.openURL(banner.link!);
                    }}
                  />
                ) : null}
              </View>
            )}
            {error ? (
              <View style={{ marginTop: 16, gap: 8 }}>
                <Label>배너를 불러오지 못했어요.</Label>
                <Action secondary title="배너 다시 불러오기" onPress={retry} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
      {count > 1 ? (
        <View
          style={{
            position: "absolute",
            bottom: 16,
            alignSelf: "center",
            flexDirection: "row",
          }}
        >
          {banners.map((banner, i) => (
            <Pressable
              key={banner.id ?? i}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}번째 배너 보기`}
              accessibilityState={{ selected: i === current }}
              aria-pressed={i === current}
              onPress={() => select(i)}
              style={{
                width: 32,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: i === current ? 7 : 5,
                  height: i === current ? 7 : 5,
                  borderRadius: 4,
                  backgroundColor: i === current ? "white" : "#ffffff66",
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
