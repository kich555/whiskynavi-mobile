export const API_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.whiskynavi.com";
export const E2E_MODE = process.env.EXPO_PUBLIC_E2E_MODE === "1";
if (
  E2E_MODE &&
  (new URL(API_URL).hostname !== "127.0.0.1" ||
    new URL(API_URL).protocol !== "http:" ||
    new URL(API_URL).port !== "8787")
)
  throw new Error(
    "E2E API origin must be the isolated loopback fixture server.",
  );
