import { SectionTabs } from "@/components/native/section-tabs";
export const unstable_settings = { anchor: "reservation" };
export default function Layout() {
  return (
    <SectionTabs
      title="스토어"
      items={[
        { name: "reservation", label: "예약", href: "/reservation" },
        { name: "shop", label: "상품", href: "/shop" },
      ]}
    />
  );
}
