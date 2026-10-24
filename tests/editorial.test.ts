import { describe, it, expect } from "vitest";
import {
  stories,
  filterStories,
  findStory,
} from "../src/features/editorial/content";
describe("editorial library", () => {
  it("keeps 37 unique stories and the stable sample route", () => {
    expect(stories).toHaveLength(37);
    expect(new Set(stories.map((s) => s.slug)).size).toBe(37);
    expect(findStory("hwayo-whisky")?.title).toBe("화요는 위스키일까?");
    expect(findStory("missing")).toBeUndefined();
  });
  it("combines category and case-insensitive trimmed search", () => {
    expect(filterStories("distillery", "")).toHaveLength(14);
    expect(filterStories("bottler", " gordon ")).toHaveLength(1);
    expect(filterStories("column", "gordon")).toHaveLength(0);
    expect(filterStories("all", "없는 검색어 xyz")).toEqual([]);
  });
  it("uses only owned CDN images with dimensions", () => {
    for (const story of stories)
      for (const b of story.blocks.filter((b) => b.type === "image")) {
        expect(b.src).toMatch(/^https:\/\/file\.whiskynavi\.com\//);
        expect(b.width).toBeGreaterThan(0);
        expect(b.height).toBeGreaterThan(0);
      }
  });
});
