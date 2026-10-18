import { Platform } from "react-native";
import { BrandHeader } from "@/components/native/brand";
import { ShopScreen } from "@/features/catalog/screens";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/components/native/ui";
export default function Route() {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {Platform.OS !== "web" ? <BrandHeader /> : null}
      <ShopScreen />
    </SafeAreaView>
  );
}
