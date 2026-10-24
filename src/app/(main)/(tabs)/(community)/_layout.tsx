import { SectionTabs } from "@/components/native/section-tabs";
export const unstable_settings = { initialRouteName: "notices" };
export default function Layout() {
  return (
    <SectionTabs
      title="커뮤니티"
      items={[
        { name: "notices", label: "공지", href: "/notices" },
        {
          name: "board/community",
          label: "커뮤니티",
          href: "/board/community",
        },
        { name: "board/news", label: "소식", href: "/board/news" },
      ]}
    />
  );
}
