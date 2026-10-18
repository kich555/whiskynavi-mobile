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
import { useState } from "react";
import {
  Pressable,
  Text,
  View,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { colors, NavLink, Sheet } from "./ui";
import type { BottleResponse } from "@/apis/generated/api";
export function BrandHeader() {
  const [open, setOpen] = useState(false);
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
            style={{ height: 44, justifyContent: "center" }}
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
              style={brand.icon}
            >
              <ShoppingCart color="white" size={23} strokeWidth={1.5} />
            </Pressable>
          </Link>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메뉴 열기"
            onPress={() => setOpen(true)}
            style={brand.icon}
          >
            <Menu color="white" size={24} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>
      <Sheet visible={open} title="WHISKYNAVI" onDismiss={() => setOpen(false)}>
        <View onTouchEnd={() => setOpen(false)}>
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
            <NavLink key={href} href={href}>
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
  const { width } = useWindowDimensions();
  const padding = width >= 375 ? 16 : 10;
  const imagePadding = width >= 375 ? 16 : 6;
  return (
    <Link href={`/archive/${bottle.id}`} asChild>
      <Pressable
        accessibilityLabel={bottle.name}
        style={{ ...brand.card, padding, paddingBottom: 8 }}
      >
        <View style={{ aspectRatio: 1, marginBottom: 8 }}>
          <Image
            source={
              bottle.imgUrl
                ? { uri: bottle.imgUrl }
                : require("../../../assets/brand/default-bottle-v2.png")
            }
            contentFit="contain"
            style={[StyleSheet.absoluteFill, { margin: imagePadding }]}
          />
        </View>
        <Text style={brand.meta}>{bottle.series ?? ""}</Text>
        <Text numberOfLines={2} style={brand.name}>
          {bottle.name}
        </Text>
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
          <Text
            numberOfLines={1}
            style={[brand.meta, { flex: 1, color: "#9299a3" }]}
          >
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
    width: 40,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    height: 200,
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
    borderWidth: 1,
    borderColor: colors.line,
    padding: 10,
    paddingBottom: 8,
  },
  meta: {
    fontFamily: "NaviSansMedium",
    fontSize: 12,
    lineHeight: 12,
    color: "#9ca3af",
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
