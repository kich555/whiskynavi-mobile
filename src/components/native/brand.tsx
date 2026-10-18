import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Line,
  Circle,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Menu, ShoppingCart, Search, ChevronDown } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { colors, NavLink, Sheet, Photo } from "./ui";
import type { BottleResponse } from "@/apis/generated/api";
export const bottleFrame = { borderWidth: 1, borderColor: colors.line };

export function BrandHeader() {
  const [pressedControl, setPressedControl] = useState<string>();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<View>(null);
  return (
    <>
      <View
        style={{
          height: 64,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.background,
        }}
      >
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="WHISKYNAVI"
            onPressIn={() => setPressedControl("logo")}
            onPressOut={() => setPressedControl(undefined)}
            style={{
              height: 48,
              justifyContent: "center",
              opacity: pressedControl === "logo" ? 0.7 : 1,
            }}
          >
            <Image
              source={require("../../../assets/brand/logo.png")}
              contentFit="contain"
              style={{ width: 132, height: 32 }}
            />
          </Pressable>
        </Link>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Link href="/general-items/cart" asChild>
            <Pressable
              accessibilityLabel="일반상품 장바구니"
              onPressIn={() => setPressedControl("cart")}
              onPressOut={() => setPressedControl(undefined)}
              style={{
                ...brand.icon,
                opacity: pressedControl === "cart" ? 0.7 : 1,
              }}
            >
              <ShoppingCart color="white" size={23} strokeWidth={1.5} />
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            ref={menuRef}
            accessibilityState={{ expanded: open }}
            accessibilityLabel="메뉴 열기"
            onPress={() => setOpen(true)}
            style={({ pressed }) => [
              brand.icon,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Menu color="white" size={24} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
      <Sheet
        visible={open}
        title="WHISKYNAVI"
        returnFocusRef={menuRef}
        onDismiss={() => setOpen(false)}
      >
        <View style={{ gap: 4 }}>
          {[
            ["/about", "회사소개"],
            ["/brand", "브랜드"],
            ["/archive", "아카이브"],
            ["/general-items", "일반상품"],
            ["/ticket-products", "이용권"],
            ["/smart-order", "스마트오더"],
            ["/reservation", "예약하기"],
            ["/board/community", "커뮤니티"],
            ["/sign-in", "로그인"],
            ["/terms", "이용약관"],
          ].map(([href, label]) => (
            <NavLink key={href} href={href} onPress={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </View>
      </Sheet>
    </>
  );
}
export function PageHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={brand.hero}>
      <LinearGradient
        colors={["#0f1419", colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="white" stopOpacity="0" />
            <Stop offset="0.5" stopColor="white" stopOpacity="0.08" />
            <Stop offset="1" stopColor="white" stopOpacity="0" />
          </SvgGradient>
        </Defs>
        {[20, 40, 60, 80].map((x) => (
          <Line
            key={x}
            x1={`${x}%`}
            x2={`${x}%`}
            y1="0"
            y2="200"
            stroke="url(#fade)"
          />
        ))}
        <Line x1="0" x2="100%" y1="15" y2="5" stroke="#ffffff20" />
        <Line x1="0" x2="100%" y1="150" y2="165" stroke="#ffffff20" />
        <Circle cx="16%" cy="14" r="4" fill="#ffffff80" />
        <Circle cx="79%" cy="117" r="4" fill="#ffffff70" />
        <Circle cx="86%" cy="72" r="3" fill="#ffffff50" />
        <Circle cx="71%" cy="140" r="3" fill="#ffffff50" />
      </Svg>
      <Text accessibilityRole="header" style={brand.heroTitle}>
        {title}
      </Text>
      <View
        style={{
          width: 96,
          height: 2,
          backgroundColor: "#ffffff70",
          marginVertical: 22,
        }}
      />
      <Text
        style={{
          fontFamily: "NaviSans",
          fontSize: 14,
          lineHeight: 23,
          color: "#ffffffcc",
          textAlign: "center",
          fontStyle: "italic",
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
export function BottleCard({ bottle }: { bottle: BottleResponse }) {
  const [pressed, setPressed] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const padding = width >= 375 || fontScale > 1.3 ? 16 : 10;
  const imagePadding = width >= 375 ? 16 : 6;
  return (
    <Link href={`/archive/${bottle.id}`} asChild>
      <Pressable
        accessibilityLabel={bottle.name}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          ...brand.card,
          padding,
          paddingBottom: 8,
          opacity: pressed ? 0.7 : 1,
        }}
      >
        <View style={{ aspectRatio: 1, marginBottom: 8 }}>
          {bottle.imgUrl ? (
            <View style={[StyleSheet.absoluteFill, { margin: imagePadding }]}>
              <Photo
                uri={bottle.imgUrl}
                label={bottle.name ?? "위스키"}
                backgroundColor="transparent"
              />
            </View>
          ) : (
            <Image
              source={require("../../../assets/brand/default-bottle-v2.png")}
              contentFit="contain"
              style={[StyleSheet.absoluteFill, { margin: imagePadding }]}
            />
          )}
        </View>
        <Text style={brand.meta}>{bottle.series ?? ""}</Text>
        <Text style={brand.name}>{bottle.name}</Text>
        {bottle.supplyPrice != null || bottle.consumerPrice != null ? (
          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              gap: 4,
              borderTopWidth: 1,
              borderColor: colors.line,
            }}
          >
            {[
              ["공급가", bottle.supplyPrice],
              ["권장소매가", bottle.consumerPrice],
            ].map(([label, value]) =>
              value != null ? (
                <View key={String(label)} style={brand.between}>
                  <Text style={{ ...brand.meta, fontSize: 10 }}>{label}</Text>
                  <Text style={brand.meta}>
                    {Number(value).toLocaleString("ko-KR")}원
                  </Text>
                </View>
              ) : null,
            )}
          </View>
        ) : null}
        <View style={[brand.between, { marginTop: 8 }]}>
          <Text style={[brand.meta, { flex: 1, color: colors.muted }]}>
            {bottle.distillery}
          </Text>
          {bottle.abv != null ? (
            <Text style={brand.meta}>{bottle.abv}%</Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
export { Search, ChevronDown };
export const brand = StyleSheet.create({
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#ffffff1f",
    backgroundColor: "#ffffff08",
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    minHeight: 200,
    paddingBottom: 24,
    backgroundColor: "#11181e",
    marginHorizontal: -16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  heroTitle: {
    fontFamily: "NaviSansBold",
    fontSize: 36,
    lineHeight: 44,
    color: "white",
    letterSpacing: -1,
  },
  card: {
    width: "100%",
    ...bottleFrame,
    padding: 10,
    paddingBottom: 8,
  },
  meta: {
    fontFamily: "NaviSansMedium",
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
  name: {
    fontFamily: "NaviSansMedium",
    fontSize: 14,
    lineHeight: 20,
    color: "white",
    marginTop: 8,
    minHeight: 40,
  },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
});
