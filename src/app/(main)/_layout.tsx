import { ChevronLeft } from "lucide-react-native";
import { Pressable } from "react-native";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { colors } from "@/components/native/ui";
export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerBackTitle: "뒤로",
        gestureEnabled: true,
        title: "WhiskyNavi",
        headerTitle: () => (
          <Image
            source={require("../../../assets/brand/logo.png")}
            contentFit="contain"
            style={{ width: 132, height: 32 }}
          />
        ),
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="archive/[bottleId]"
        options={{
          title: "위스키 상세",
          headerTitle: "위스키 상세",
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="아카이브로 돌아가기"
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace("/archive")
              }
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft size={24} color="white" />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
