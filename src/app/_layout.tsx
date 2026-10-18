import { useFonts } from "expo-font";
import { DarkTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/lib/providers";
import { colors } from "@/components/native/ui";
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NaviSans: require("../../assets/fonts/NaviSans.ttf"),
    NaviSansMedium: require("../../assets/fonts/NaviSansMedium.ttf"),
    NaviSansBold: require("../../assets/fonts/NaviSansBold.ttf"),
  });
  if (!fontsLoaded && !fontError) return null;
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
