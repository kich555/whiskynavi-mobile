import { SectionTabs } from "@/components/native/section-tabs";
export const unstable_settings = { anchor: "brand" };
export default function Layout() {
  return (
    <SectionTabs
      title="아카이브"
      items={[
        { name: "brand", label: "브랜드", href: "/brand" },
        { name: "archive", label: "아카이브", href: "/archive" },
      ]}
    />
  );
}
