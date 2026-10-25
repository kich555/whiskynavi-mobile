import { expect, it } from "vitest";
import { youtubeEmbedUrl, youtubeVideoId } from "../src/lib/youtube";

for (const url of [
  "https://www.youtube.com/embed/M7lc1UVf-VE?rel=0",
  "https://youtube.com/watch?v=M7lc1UVf-VE&feature=shared",
  "https://youtu.be/M7lc1UVf-VE?t=30",
  "https://m.youtube.com/shorts/M7lc1UVf-VE",
  "https://www.youtube.com/live/M7lc1UVf-VE",
  "https://www.youtube-nocookie.com/embed/M7lc1UVf-VE",
])
  it(`extracts a video ID from ${url}`, () =>
    expect(youtubeVideoId(url)).toBe("M7lc1UVf-VE"));

for (const url of [
  "",
  "not a URL",
  "javascript:alert(1)",
  "http://youtube.com/watch?v=M7lc1UVf-VE",
  "https://youtube.com.evil.test/embed/M7lc1UVf-VE",
  "https://youtube.com@evil.test/embed/M7lc1UVf-VE",
  "https://evil.test/watch?v=M7lc1UVf-VE",
  "https://youtube.com/playlist?list=M7lc1UVf-VE",
  "https://youtu.be/invalid",
  "https://youtube.com/embed/%3Cscript%3E",
])
  it(`rejects invalid video URL ${url}`, () =>
    expect(youtubeVideoId(url)).toBeNull());
it("constructs an inline user-initiated player URL from a validated ID", () => {
  expect(youtubeEmbedUrl("M7lc1UVf-VE")).toBe(
    "https://www.youtube.com/embed/M7lc1UVf-VE?autoplay=1&playsinline=1&rel=0",
  );
  expect(() => youtubeEmbedUrl('invalid"/>')).toThrow();
});
