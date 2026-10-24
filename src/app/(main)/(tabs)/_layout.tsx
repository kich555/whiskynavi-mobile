import { NativeTabs } from "expo-router/native-tabs";
import { colors } from "@/components/native/ui";
export default function Layout() {
  return (
    <NativeTabs
      backgroundColor={colors.background}
      tintColor={colors.accent}
      labelStyle={{ color: colors.muted, selected: { color: colors.accent } }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="archive">
        <NativeTabs.Trigger.Label>아카이브</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reservation">
        <NativeTabs.Trigger.Label>예약</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shop">
        <NativeTabs.Trigger.Label>쇼핑</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag" md="shopping_bag" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-page">
        <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
