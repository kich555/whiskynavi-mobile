import type { UserBannerResponse } from "@/apis/generated/api";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
type HomeBannerProps = {
  banners: UserBannerResponse[];
  loading: boolean;
  error: boolean;
  retry: () => void;
};
export function HomeBanner(props: HomeBannerProps) {
  return (
    <BannerPager
      key={JSON.stringify(
        props.banners.map((banner) => [banner.id, banner.backgroundUrl]),
      )}
      {...props}
    />
  );
}
function BannerPager({ banners, loading, error, retry }: HomeBannerProps) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const selected = useRef(0);
  const lastOffset = useRef(0);
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
  const looping = count > 1;
  const bannerHeight = Math.max(440, Math.min(620, height - 220));
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
      const normalized = count ? ((next % count) + count) % count : 0;
      selected.current = normalized;
      setIndex(normalized);
      restart((n) => n + 1);
      scroll.current?.scrollTo({
        x: (next + (looping ? 1 : 0)) * width,
        animated: animate && motionAllowed,
      });
    },
    [width, motionAllowed, count, looping],
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
    const timer = setTimeout(() => select(current + 1), INTERVAL);
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
  useLayoutEffect(() => {
    clearTimeout(scrollTimer.current);
    if (width)
      scroll.current?.scrollTo({
        x: (selected.current + (looping ? 1 : 0)) * width,
        animated: false,
      });
  }, [width, looping]);
  const settleOffset = (offset: number) => {
    if (!width || !count || touching.current) return;
    const page = Math.round(offset / width);
    // Never rebase while a finger or momentum is between pages.
    if (Math.abs(offset - page * width) > 1) return;
    const next = (((page - (looping ? 1 : 0)) % count) + count) % count;
    selected.current = next;
    setIndex(next);
    if (looping && (page === 0 || page === count + 1)) {
      scroll.current?.scrollTo({ x: (next + 1) * width, animated: false });
    }
    setInteracting(touching.current);
    restart((n) => n + 1);
  };
  const releaseTouch = () => {
    touching.current = false;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(
      () => settleOffset(lastOffset.current),
      150,
    );
  };
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    settleOffset(event.nativeEvent.contentOffset.x);
  const slides: (UserBannerResponse | undefined)[] = looping
    ? [banners[count - 1], ...banners, banners[0]]
    : count
      ? banners
      : [undefined];
  return (
    <View
      testID="home-banner"
      style={{ minHeight: bannerHeight }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <ScrollView
          ref={scroll}
          horizontal
          pagingEnabled
          directionalLockEnabled
          decelerationRate="fast"
          disableIntervalMomentum
          snapToInterval={width}
          bounces={false}
          overScrollMode="never"
          contentOffset={{ x: looping ? width : 0, y: 0 }}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={count > 1}
          testID="home-banner-scroll"
          scrollEventThrottle={16}
          onScroll={(event) => {
            setInteracting(true);
            clearTimeout(scrollTimer.current);
            const offset = event.nativeEvent.contentOffset.x;
            lastOffset.current = offset;
            scrollTimer.current = setTimeout(() => settleOffset(offset), 150);
          }}
          onScrollBeginDrag={() => setInteracting(true)}
          onScrollEndDrag={(event) => {
            if (event.nativeEvent.velocity?.x === 0) settle(event);
          }}
          onMomentumScrollEnd={settle}
          onTouchStart={() => {
            touching.current = true;
            setInteracting(true);
          }}
          onTouchEnd={releaseTouch}
          onTouchCancel={releaseTouch}
        >
          {slides.map((banner, page) => {
            const original = page - (looping ? 1 : 0);
            const isCurrent = original === current;
            return (
              <View
                key={`${page}:${banner?.id ?? "fallback"}`}
                testID={isCurrent ? "active-home-banner" : undefined}
                accessibilityElementsHidden={!isCurrent}
                importantForAccessibility={
                  isCurrent ? "auto" : "no-hide-descendants"
                }
                aria-hidden={!isCurrent}
                style={{
                  width: width || 1,
                  minHeight: bannerHeight,
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
                    <Action
                      secondary
                      title="배너 다시 불러오기"
                      onPress={retry}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}
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
