import type { ConfigContext, ExpoConfig } from "expo/config";
export default ({ config }: ConfigContext): ExpoConfig => {
  const e2e = process.env.APP_VARIANT === "e2e";
  if (!e2e && process.env.EXPO_PUBLIC_E2E_MODE === "1")
    throw new Error("E2E mode requires APP_VARIANT=e2e.");
  if (e2e) {
    const api = new URL(process.env.EXPO_PUBLIC_API_BASE_URL ?? "");
    if (api.origin !== "http://127.0.0.1:8787")
      throw new Error(
        "E2E builds require the isolated loopback fixture server on port 8787.",
      );
  }
  return {
    ...config,
    name: e2e ? "WhiskyNavi E2E" : "WhiskyNavi",
    slug: "whiskynavi-mobile",
    icon: "./assets/images/brand-icon.png",
    scheme: e2e ? "whiskynavi-e2e" : "whiskynavimobile",
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(e2e
          ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }
          : {}),
      },
      icon: "./assets/images/brand-icon.png",
      bundleIdentifier: e2e
        ? "com.whiskynavi.mobile.e2e"
        : "com.whiskynavi.mobile",
      supportsTablet: false,
    },
    android: {
      ...config.android,
      adaptiveIcon: {
        foregroundImage: "./assets/images/brand-icon.png",
        backgroundColor: "#f6f2e9",
      },
      package: e2e ? "com.whiskynavi.mobile.e2e" : "com.whiskynavi.mobile",
      predictiveBackGestureEnabled: true,
    },
    web: { ...config.web, output: "single" },
    userInterfaceStyle: "dark",
    plugins: [
      ...(config.plugins ?? []).filter(
        (plugin) =>
          (typeof plugin === "string" ? plugin : plugin[0]) !==
            "expo-build-properties" &&
          (typeof plugin === "string" ? plugin : plugin[0]) !==
            "expo-splash-screen",
      ),
      [
        "expo-splash-screen",
        {
          image: "./assets/images/brand-icon.png",
          imageWidth: 120,
          backgroundColor: "#f6f2e9",
        },
      ],
      ["expo-build-properties", { android: { usesCleartextTraffic: e2e } }],
    ],
  } as ExpoConfig;
};
