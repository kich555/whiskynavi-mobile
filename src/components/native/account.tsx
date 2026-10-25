import { decorativeIconAccessibility } from "@/lib/icon-accessibility";
import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { SurfaceLink, colors } from "./ui";
export type StatusTone = "neutral" | "positive" | "warning" | "danger";
const tones = {
  neutral: { text: "#cbd5e1", fill: "#cbd5e112" },
  positive: { text: "#bbf7d0", fill: "#4ade8015" },
  warning: { text: "#fde68a", fill: "#facc1515" },
  danger: { text: "#fecaca", fill: "#f8717115" },
};
export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: StatusTone;
}) {
  return (
    <View style={[accountUI.pill, { backgroundColor: tones[tone].fill }]}>
      <Text
        style={[
          accountUI.caption,
          { color: tones[tone].text, fontFamily: "NaviSansMedium" },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}
export function AccountSection({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={accountUI.panel}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {icon ? (
            <View
              aria-hidden
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {icon}
            </View>
          ) : null}
          <Text accessibilityRole="header" style={accountUI.sectionTitle}>
            {title}
          </Text>
        </View>
        {subtitle ? <Text style={accountUI.caption}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}
export function InfoPair({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <View style={accountUI.info}>
      <Text style={[accountUI.caption, { flex: 1 }]}>{label}</Text>
      <Text style={[accountUI.body, { flex: 2, textAlign: "right" }]}>
        {value ?? "—"}
      </Text>
    </View>
  );
}
export function HistoryCard({
  href,
  title,
  eyebrow,
  badge,
  children,
}: {
  href: string;
  title: string;
  eyebrow?: string;
  badge: ReactNode;
  children: ReactNode;
}) {
  return (
    <SurfaceLink href={href} style={accountUI.history}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <Text style={accountUI.caption}>{eyebrow}</Text>
        {badge}
      </View>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Text style={[accountUI.sectionTitle, { flex: 1 }]}>{title}</Text>
        <ChevronRight
          size={18}
          color={colors.muted}
          {...decorativeIconAccessibility(Platform.OS)}
        />
      </View>
      {children}
    </SurfaceLink>
  );
}
export const accountUI = StyleSheet.create({
  panel: {
    padding: 16,
    gap: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    borderCurve: "continuous",
  },
  history: {
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    borderCurve: "continuous",
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: "NaviSansBold",
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    color: colors.text,
    fontFamily: "NaviSansMedium",
    fontSize: 14,
    lineHeight: 22,
  },
  caption: {
    color: colors.muted,
    fontFamily: "NaviSans",
    fontSize: 12,
    lineHeight: 18,
  },
  price: {
    color: colors.text,
    fontFamily: "NaviSansBold",
    fontSize: 20,
    lineHeight: 28,
  },
  info: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  divider: { height: 1, backgroundColor: colors.line },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: "continuous",
  },
});
