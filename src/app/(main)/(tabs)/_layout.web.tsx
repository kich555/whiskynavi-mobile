import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Pressable, View } from "react-native";
import type { ComponentProps } from "react";
import {
  House,
  Grid2X2,
  ShoppingBag,
  MessagesSquare,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { colors } from "@/components/native/ui";
import { BrandHeader } from "@/components/native/brand";
function BottomTab({
  label,
  icon: Icon,
  isFocused,
  ...props
}: ComponentProps<typeof Pressable> & {
  label: string;
  icon: LucideIcon;
  isFocused?: boolean;
}) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      aria-selected={isFocused}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        minHeight: 64,
      }}
    >
      <Icon
        size={22}
        color={isFocused ? colors.text : colors.muted}
        strokeWidth={isFocused ? 2.4 : 1.5}
      />
      <Text
        style={{
          color: isFocused ? colors.text : colors.muted,
          fontSize: 12,
          fontFamily: isFocused ? "NaviSansBold" : "NaviSans",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <BrandHeader />
      <Tabs style={{ flex: 1 }}>
        <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <TabSlot detachInactiveScreens style={{ flex: 1, minHeight: 0 }} />
        </View>
        <TabList
          accessibilityRole="tablist"
          accessibilityLabel="하단 메뉴"
          style={{
            backgroundColor: colors.background,
            borderTopWidth: 1,
            borderColor: colors.line,
            justifyContent: "space-around",
            height: 64,
            flexShrink: 0,
          }}
        >
          {[
            { name: "main-home", href: "/", label: "홈", icon: House },
            {
              name: "main-archive",
              href: "/brand",
              label: "아카이브",
              icon: Grid2X2,
            },
            {
              name: "main-store",
              href: "/reservation",
              label: "스토어",
              icon: ShoppingBag,
            },
            {
              name: "main-community",
              href: "/notices",
              label: "커뮤니티",
              icon: MessagesSquare,
            },
            {
              name: "main-my",
              href: "/my-page",
              label: "마이",
              icon: UserRound,
            },
          ].map(({ name, href, label, icon }) => (
            <TabTrigger
              key={name}
              name={name}
              href={href as never}
              resetOnFocus={false}
              asChild
            >
              <BottomTab label={label} icon={icon} />
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>
    </SafeAreaView>
  );
}
