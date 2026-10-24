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
      <NativeTabs.Trigger name="(archive)" disablePopToTop disableScrollToTop>
        <NativeTabs.Trigger.Label>아카이브</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="grid_view" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(store)" disablePopToTop disableScrollToTop>
        <NativeTabs.Trigger.Label>스토어</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bag" md="shopping_bag" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(community)" disablePopToTop disableScrollToTop>
        <NativeTabs.Trigger.Label>커뮤니티</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right" md="forum" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-page">
        <NativeTabs.Trigger.Label>마이</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
