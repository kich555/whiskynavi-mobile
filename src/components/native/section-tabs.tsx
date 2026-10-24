import { Tabs, TabList, TabTrigger, TabSlot } from "expo-router/ui";
import { useState, type ComponentProps } from "react";
import { Platform, Pressable, Text, View } from "react-native";
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
        minHeight: 48,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.65 : 1,
        borderRadius: 4,
        outlineWidth: focused ? 2 : 0,
        outlineColor: colors.text,
        outlineStyle: "solid",
      })}
    >
      <Text
        style={{
          fontFamily: isFocused ? "NaviSansBold" : "NaviSansMedium",
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
            left: 18,
            right: 18,
            height: 2,
            backgroundColor: colors.text,
            borderRadius: 1,
          }}
        />
      ) : null}
    </Pressable>
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
      <Tabs options={{ backBehavior: "none" }} style={{ flex: 1 }}>
        <TabList
          accessibilityRole="tablist"
          accessibilityLabel={`${title} 메뉴`}
          style={{
            flexDirection: "row",
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderColor: colors.line,
            flexShrink: 0,
          }}
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
        </TabList>
        <View style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <TabSlot detachInactiveScreens style={{ flex: 1, minHeight: 0 }} />
        </View>
      </Tabs>
    </SafeAreaView>
  );
}
