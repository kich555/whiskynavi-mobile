import { youtubeEmbedUrl, type YouTubePlayerProps } from "@/lib/youtube";
export function YouTubePlayer({
  videoId,
  onLoad,
  onError,
}: YouTubePlayerProps) {
  return (
    <iframe
      data-testid="home-youtube-player"
      title="위스키내비 YouTube 플레이어"
      src={youtubeEmbedUrl(videoId)}
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={onLoad}
      onError={onError}
      style={{ width: "100%", height: "100%", border: 0, background: "black" }}
    />
  );
}
