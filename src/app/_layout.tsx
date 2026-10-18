import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { DarkTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/lib/providers";
import { Skeleton } from "@/components/native/skeleton";
import { colors } from "@/components/native/ui";
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NaviSans: require("../../assets/fonts/NaviSans.ttf"),
    NaviSansMedium: require("../../assets/fonts/NaviSansMedium.ttf"),
    NaviSansBold: require("../../assets/fonts/NaviSansBold.ttf"),
  });
  const [waitExpired, setWaitExpired] = useState(false);
  const [continueWithFallback, setContinueWithFallback] = useState(false);
  useEffect(() => {
    if (fontsLoaded || fontError) return;
    const timer = setTimeout(() => setWaitExpired(true), 4000);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError && !continueWithFallback)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "flex-start",
          paddingTop: 64,
          alignItems: "center",
          padding: 24,
          gap: 20,
        }}
      >
        <Skeleton variant="app" label="앱 준비 중" />
        <Text style={{ color: "white", fontSize: 16 }}>
          위스키내비를 준비하고 있어요.
        </Text>
        {waitExpired ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setContinueWithFallback(true)}
            style={{
              minHeight: 48,
              padding: 16,
              backgroundColor: "white",
              borderRadius: 4,
            }}
          >
            <Text style={{ color: colors.background }}>
              기본 글꼴로 계속하기
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  return (
    <Providers>
      <ThemeProvider
        value={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background,
            card: colors.background,
            text: colors.text,
            primary: colors.accent,
            border: colors.line,
          },
        }}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(main)" options={{ headerShown: false }} />
          <Stack.Screen
            name="provider"
            options={{
              title: "본인인증 · 결제",
              presentation: "modal",
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="nice/callback"
            options={{ title: "본인인증 결과" }}
          />
        </Stack>
      </ThemeProvider>
    </Providers>
  );
}
