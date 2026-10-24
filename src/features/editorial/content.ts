import library from "@/data/editorial/library.json";
export type Block = {
  type: string;
  html?: string;
  text?: string;
  id?: string;
  src?: string;
  original?: string;
  width?: number;
  height?: number;
  alt?: string;
  caption?: string;
  items?: string[];
};
export type Story = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  status: string;
  readingMinutes: number;
  cover: string | null;
  toc: { id: string; title: string }[];
  blocks: Block[];
};
export const stories = library as Story[];
export const categories = [
  { id: "all", label: "전체" },
  { id: "column", label: "위스키 칼럼" },
  { id: "distillery", label: "증류소 이야기" },
  { id: "bottler", label: "독립병입자 이야기" },
];
export function filterStories(category: string, query: string) {
  const q = query.trim().toLocaleLowerCase();
  return stories.filter(
    (s) =>
      (category === "all" || s.category === category) &&
      `${s.title} ${s.description} ${s.categoryLabel}`
        .toLocaleLowerCase()
        .includes(q),
  );
}
export function findStory(slug: string) {
  return stories.find((s) => s.slug === slug);
}
