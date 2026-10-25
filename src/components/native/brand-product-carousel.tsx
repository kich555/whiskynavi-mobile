import type { BottleResponse } from "@/apis/generated/api";
import { brandCardPosition } from "@/lib/brand-carousel";
import { Link } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ImageLightbox } from "./image-lightbox";

export function BrandProductCarousel({
  bottles,
  label,
}: {
  bottles: BottleResponse[];
  label: string;
}) {
  return bottles.length ? (
    <Carousel
      key={JSON.stringify(bottles.map((item) => item.id))}
      bottles={bottles}
      label={label}
    />
  ) : null;
}
function Carousel({
  bottles,
  label,
}: {
  bottles: BottleResponse[];
  label: string;
}) {
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const [measuredWidth, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState<string>();
  const until = useRef(0);
  const viewportWidth = measuredWidth || windowWidth;
  const baseWidth = Math.min(240, viewportWidth * 0.62);
  const stageWidth = Math.max(1, viewportWidth - 72);
  const extraHeight = Math.max(0, fontScale - 1) * 100;
  const stageHeight = (viewportWidth >= 375 ? 440 : 360) + extraHeight;
  const choose = useCallback(
    (next: number) => {
      if (Date.now() < until.current) return;
      until.current = Date.now() + 400;
      setIndex(((next % bottles.length) + bottles.length) % bottles.length);
    },
    [bottles.length],
  );
  const step = useCallback(
    (delta: number) => choose(index + delta),
    [choose, index],
  );
  const pan = usePanGesture({
    enabled: bottles.length > 1,
    activeOffsetX: [-10, 10],
    failOffsetY: [-12, 12],
    onDeactivate: (event) => {
      "worklet";
      if (!event.canceled && Math.abs(event.translationX) >= 50)
        scheduleOnRN(step, event.translationX < 0 ? 1 : -1);
    },
  });
  return (
    <View
      testID={`brand-carousel-${label}`}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <GestureHandlerRootView
        style={{
          height: stageHeight,
          marginHorizontal: 36,
          overflow: "hidden",
        }}
      >
        <GestureDetector gesture={pan} touchAction="pan-y">
          <View
            testID="brand-carousel-stage"
            style={{ width: stageWidth, height: stageHeight }}
          >
            {bottles.map((bottle, item) =>
              brandCardPosition(item, index, bottles.length, baseWidth)
                .visible ? (
                <CarouselCard
                  key={bottle.id ?? item}
                  bottle={bottle}
                  item={item}
                  current={index}
                  count={bottles.length}
                  baseWidth={baseWidth}
                  stageWidth={stageWidth}
                  stageHeight={stageHeight}
                  extraHeight={extraHeight}
                  onSelect={() => choose(item)}
                  onExpand={setExpanded}
                />
              ) : null,
            )}
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
      {bottles.length > 1 ? (
        <View
          accessibilityRole="tablist"
          accessibilityLabel={`${label} 제품 선택`}
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 8,
            paddingHorizontal: 24,
          }}
        >
          {bottles.map((bottle, item) => (
            <Pressable
              key={bottle.id ?? item}
              accessibilityRole="tab"
              accessibilityLabel={`${item + 1}번째 제품 보기`}
              accessibilityState={{ selected: index === item }}
              aria-selected={index === item}
              onPress={() => choose(item)}
              style={{
                minWidth: 24,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: index === item ? 24 : 4,
                  height: 4,
                  backgroundColor: index === item ? "white" : "#ffffff66",
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
      {expanded ? (
        <ImageLightbox
          uri={expanded}
          label={bottles[index]?.name ?? label}
          onClose={() => setExpanded(undefined)}
        />
      ) : null}
    </View>
  );
}
function CarouselCard({
  bottle,
  item,
  current,
  count,
  baseWidth,
  stageWidth,
  stageHeight,
  extraHeight,
  onSelect,
  onExpand,
}: {
  bottle: BottleResponse;
  item: number;
  current: number;
  count: number;
  baseWidth: number;
  stageWidth: number;
  stageHeight: number;
  extraHeight: number;
  onSelect: () => void;
  onExpand: (uri: string) => void;
}) {
  const position = brandCardPosition(item, current, count, baseWidth);
  const center = item === current;
  const animatedStyle = useAnimatedStyle(() => {
    const config = {
      duration: 700,
      easing: Easing.inOut(Easing.ease),
      reduceMotion: ReduceMotion.System,
    };
    const height = position.height + extraHeight;
    return {
      width: withTiming(position.width, config),
      height: withTiming(height, config),
      left: withTiming((stageWidth - position.width) / 2 + position.x, config),
      top: withTiming((stageHeight - height) / 2, config),
      opacity: withTiming(position.visible ? 1 : 0, config),
      zIndex: position.zIndex,
    };
  }, [
    position.width,
    position.height,
    position.x,
    position.visible,
    position.zIndex,
    stageWidth,
    stageHeight,
    extraHeight,
  ]);
  const picture = (
    <Image
      source={
        bottle.imgUrl
          ? { uri: bottle.imgUrl }
          : require("../../../assets/brand/default-bottle-v2.png")
      }
      contentFit="contain"
      contentPosition="center"
      style={StyleSheet.absoluteFill}
    />
  );
  const copy = (
    <>
      <Text numberOfLines={1} style={s.badge}>
        {bottle.series}
      </Text>
      <Text numberOfLines={2} style={s.name}>
        {bottle.name}
      </Text>
    </>
  );
  return (
    <Animated.View
      testID={center ? "brand-carousel-center" : `brand-carousel-card-${item}`}
      pointerEvents={position.visible ? "auto" : "none"}
      accessibilityElementsHidden={!position.visible}
      importantForAccessibility={
        position.visible ? "auto" : "no-hide-descendants"
      }
      aria-hidden={!position.visible}
      style={[
        s.card,
        {
          borderColor: center ? "#ffffff4d" : "#ffffff33",
          backgroundColor: center ? "#2f3740bf" : "#2a31374d",
          padding: center ? 20 : Math.abs(position.relative) === 1 ? 16 : 12,
          boxShadow: "0px 8px 32px #00000066",
        },
        animatedStyle,
      ]}
    >
      {center ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${bottle.name ?? "제품"} 이미지 확대`}
            disabled={!bottle.imgUrl}
            onPress={() => bottle.imgUrl && onExpand(bottle.imgUrl)}
            style={s.picture}
          >
            {picture}
          </Pressable>
          <Link href={`/archive/${bottle.id}`} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${bottle.name ?? "제품"} 상세 보기`}
              style={{ minHeight: 44 }}
            >
              {copy}
            </Pressable>
          </Link>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${bottle.name ?? "제품"} 가운데로 보기`}
          onPress={onSelect}
          style={{ flex: 1 }}
        >
          <View style={s.picture}>{picture}</View>
          {copy}
        </Pressable>
      )}
      {!center ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: `rgba(0,0,0,${1 - position.brightness})` },
          ]}
        />
      ) : null}
    </Animated.View>
  );
}
const s = StyleSheet.create({
  card: { position: "absolute", borderWidth: 1 },
  picture: { flex: 1, minHeight: 0, marginBottom: 12 },
  badge: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    fontFamily: "NaviSansBold",
    fontSize: 12,
    lineHeight: 16,
    color: "#ffffffe6",
    borderWidth: 1,
    borderColor: "#ffffff33",
    backgroundColor: "#ffffff26",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 16,
  },
  name: {
    fontFamily: "NaviSansMedium",
    fontSize: 14,
    lineHeight: 20,
    color: "white",
  },
});
