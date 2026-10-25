export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    const host = url.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      const parts = url.pathname.split("/");
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : ["embed", "shorts", "live"].includes(parts[1])
            ? parts[2]
            : null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function youtubeEmbedUrl(id: string) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id))
    throw new Error("Invalid YouTube video ID");
  return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
}
export type YouTubePlayerProps = {
  videoId: string;
  onLoad: () => void;
  onError: () => void;
};
