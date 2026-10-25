import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { useState, type ComponentProps } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandHeader } from "./brand";
import { colors } from "./ui";

export function SectionTab({
  label,
  isFocused,
  ...props
}: ComponentProps<typeof Pressable> & { label: string; isFocused?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      {...props}
      onFocus={(event) => {
        setFocused(
          Platform.OS !== "web" ||
            (event.currentTarget as unknown as HTMLElement).matches(
              ":focus-visible",
            ),
        );
        props.onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        props.onBlur?.(event);
      }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      aria-selected={isFocused}
      style={({ pressed }) => ({
        minHeight: 52,
        minWidth: 64,
        paddingHorizontal: 12,
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? colors.surface : "transparent",
        borderRadius: 4,
        outlineWidth: focused ? 2 : 0,
        outlineColor: colors.text,
        outlineStyle: "solid",
      })}
    >
      <Text
        style={{
          fontFamily: "NaviSansBold",
          fontSize: 16,
          color: isFocused ? colors.text : colors.muted,
        }}
      >
        {label}
      </Text>
      {isFocused ? (
        <View
          testID="section-tab-indicator"
          style={{
            position: "absolute",
            bottom: 0,
            left: 12,
            right: 12,
            height: 3,
            backgroundColor: colors.text,
            borderRadius: 2,
          }}
        />
      ) : null}
    </Pressable>
  );
}

// TabList injects View layout styles. Keep them on this outer surface so
// native ScrollView receives child layout only through contentContainerStyle.
function SectionTabStrip({
  children,
  style,
  ...props
}: ComponentProps<typeof View>) {
  return (
    <SafeAreaView {...props} edges={["left", "right"]} style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 8,
          justifyContent: "flex-start",
          alignItems: "stretch",
        }}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SectionTabs({
  title,
  items,
}: {
  title: string;
  items: { name: string; label: string; href: string }[];
}) {
  return (
    <SafeAreaView
      edges={Platform.OS === "web" ? [] : ["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {Platform.OS !== "web" ? <BrandHeader /> : null}
      <Tabs options={{ backBehavior: "initialRoute" }} style={{ flex: 1 }}>
        <TabList
          asChild
          style={{
            flexGrow: 0,
            flexShrink: 0,
            borderBottomWidth: 1,
            borderColor: colors.line,
          }}
        >
          <SectionTabStrip
            accessibilityRole="tablist"
            accessibilityLabel={`${title} 메뉴`}
          >
            {items.map(({ name, label, href }) => (
              <TabTrigger
                key={name}
                name={name}
                href={href as never}
                resetOnFocus={false}
                asChild
              >
                <SectionTab label={label} />
              </TabTrigger>
            ))}
          </SectionTabStrip>
        </TabList>
        <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <TabSlot detachInactiveScreens style={{ flex: 1, minHeight: 0 }} />
        </View>
      </Tabs>
    </SafeAreaView>
  );
}
