import { decorativeIconAccessibility } from "@/lib/icon-accessibility";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { Play, Video, X } from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from "react";
import {
  Platform,
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { youtubeVideoId } from "@/lib/youtube";
import { YouTubePlayer } from "./youtube-player";
import { Action, Heading, Label, colors } from "./ui";

export function HomeVideo({ url }: { url: string }) {
  const videoId = youtubeVideoId(url);
  return videoId ? <VideoCard key={videoId} videoId={videoId} /> : null;
}
function VideoCard({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const playRef = useRef<ComponentRef<typeof View>>(null);
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") setPlaying(false);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!playing || !loading || failed) return;
    const timer = setTimeout(() => {
      setFailed(true);
      setLoading(false);
    }, 15_000);
    return () => clearTimeout(timer);
  }, [playing, loading, failed]);
  // YouTube requires at least a 200px-high viewport, including on narrow phones.
  const playerHeight = Math.max(200, ((width - 32) * 9) / 16);
  const close = () => {
    setPlaying(false);
    requestAnimationFrame(() => playRef.current?.focus());
  };
  return (
    <View style={{ padding: 16, paddingVertical: 24, gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Heading>위스키내비 영상</Heading>
        <Video
          size={24}
          color={colors.muted}
          {...decorativeIconAccessibility(Platform.OS)}
        />
      </View>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 12,
          backgroundColor: "black",
        }}
      >
        {playing ? (
          <View style={{ height: playerHeight }}>
            {failed ? (
              <View
                style={{
                  flex: 1,
                  padding: 24,
                  gap: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Label>영상을 불러오지 못했어요.</Label>
                <Action
                  title="영상 다시 재생"
                  onPress={() => {
                    setFailed(false);
                    setLoading(true);
                  }}
                />
              </View>
            ) : (
              <YouTubePlayer
                videoId={videoId}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setFailed(true);
                  setLoading(false);
                }}
              />
            )}
            {loading && !failed ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  inset: 0,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator
                  color="white"
                  accessibilityLabel="영상 불러오는 중"
                />
              </View>
            ) : null}
          </View>
        ) : (
          <Pressable
            ref={playRef}
            testID="home-video-thumbnail"
            accessibilityRole="button"
            accessibilityLabel="위스키내비 대표 영상 재생"
            onPress={() => {
              setFailed(false);
              setLoading(true);
              setPlaying(true);
            }}
            style={({ pressed }) => ({
              aspectRatio: 16 / 9,
              justifyContent: "center",
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
              backgroundColor: colors.surface,
            })}
          >
            {!thumbnailFailed ? (
              <Image
                source={{
                  uri: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                }}
                contentFit="cover"
                onError={() => setThumbnailFailed(true)}
                style={{ position: "absolute", inset: 0 }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: "NaviSansBold",
                  fontSize: 16,
                  color: colors.text,
                  position: "absolute",
                  top: 24,
                }}
              >
                위스키내비 대표 영상
              </Text>
            )}
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#000000b3",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Play
                size={26}
                color="white"
                fill="white"
                style={{ marginLeft: 3 }}
              />
            </View>
          </Pressable>
        )}
      </View>
      {playing ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="영상 재생 닫기"
            onPress={close}
            style={{
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <X size={18} color={colors.text} />
            <Label>닫기</Label>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="YouTube에서 영상 보기"
            onPress={() => {
              setPlaying(false);
              void Linking.openURL(
                `https://www.youtube.com/watch?v=${videoId}`,
              ).catch(() => setLinkFailed(true));
            }}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Label muted>YouTube에서 보기</Label>
          </Pressable>
        </View>
      ) : null}
      {linkFailed ? (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          YouTube를 열지 못했어요. 다시 시도해 주세요.
        </Text>
      ) : null}
    </View>
  );
}
