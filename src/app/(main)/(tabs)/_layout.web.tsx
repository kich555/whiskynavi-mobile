import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { Text } from "react-native";
import {
  House,
  Grid2X2,
  CalendarDays,
  ShoppingBag,
  UserRound,
} from "lucide-react-native";
import { colors } from "@/components/native/ui";
import { BrandHeader } from "@/components/native/brand";
export default function Layout() {
  const path = usePathname();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <BrandHeader />
      <Tabs style={{ flex: 1 }}>
        <TabSlot style={{ flex: 1, minHeight: 0 }} />
        <TabList
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
            { name: "home", href: "/", label: "홈", icon: House },
            {
              name: "archive",
              href: "/archive",
              label: "아카이브",
              icon: Grid2X2,
            },
            {
              name: "reservation",
              href: "/reservation",
              label: "예약",
              icon: CalendarDays,
            },
            { name: "shop", href: "/shop", label: "쇼핑", icon: ShoppingBag },
            { name: "my", href: "/my-page", label: "마이", icon: UserRound },
          ].map(({ name, href, label, icon: Icon }) => (
            <TabTrigger
              key={name}
              name={name}
              href={href as never}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <Icon
                size={22}
                color={path === href ? colors.text : colors.muted}
                strokeWidth={path === href ? 2.4 : 1.5}
              />
              <Text
                style={{
                  color: path === href ? colors.text : colors.muted,
                  fontSize: 12,
                  fontFamily: path === href ? "NaviSansBold" : "NaviSans",
                }}
              >
                {label}
              </Text>
            </TabTrigger>
          ))}
        </TabList>
      </Tabs>
    </SafeAreaView>
  );
}
