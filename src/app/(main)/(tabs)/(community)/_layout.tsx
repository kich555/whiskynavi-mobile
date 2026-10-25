import { SectionTabs } from "@/components/native/section-tabs";
export const unstable_settings = { anchor: "board/news" };
export default function Layout() {
  return (
    <SectionTabs
      title="커뮤니티"
      items={[
        { name: "board/news", label: "소식", href: "/board/news" },
        {
          name: "board/community",
          label: "커뮤니티",
          href: "/board/community",
        },
        { name: "stories", label: "스토리", href: "/stories" },
      ]}
    />
  );
}
