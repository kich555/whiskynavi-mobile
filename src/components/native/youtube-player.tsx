import Constants from "expo-constants";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import { youtubeEmbedUrl, type YouTubePlayerProps } from "@/lib/youtube";

export function YouTubePlayer({
  videoId,
  onLoad,
  onError,
}: YouTubePlayerProps) {
  const appId =
    Constants.executionEnvironment === "storeClient"
      ? "host.exp.exponent"
      : Platform.OS === "ios"
        ? Constants.expoConfig?.ios?.bundleIdentifier
        : Constants.expoConfig?.android?.package;
  // YouTube requires the installed app's identity for WebView embeds (error 153).
  const referrer = `https://${(appId ?? "com.whiskynavi.mobile").toLowerCase()}`;
  return (
    <WebView
      testID="home-youtube-player"
      accessibilityLabel="위스키내비 YouTube 플레이어"
      source={{ uri: youtubeEmbedUrl(videoId), headers: { Referer: referrer } }}
      style={{ flex: 1, backgroundColor: "black" }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      onLoadEnd={onLoad}
      onError={onError}
      onHttpError={onError}
      onContentProcessDidTerminate={onError}
      onRenderProcessGone={onError}
      onShouldStartLoadWithRequest={(request) => {
        if (!request.isTopFrame || request.url === "about:blank") return true;
        try {
          const url = new URL(request.url);
          return (
            url.protocol === "https:" &&
            ["www.youtube.com", "youtube.com"].includes(url.hostname)
          );
        } catch {
          return false;
        }
      }}
    />
  );
}
