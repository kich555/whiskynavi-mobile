import { parseDocument, DomUtils } from "htmlparser2";
import { useMemo, type ReactNode } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/components/native/ui";
type Node = ReturnType<typeof parseDocument>["children"][number];
function inline(n: Node, i: number): ReactNode {
  if (n.type === "text") return n.data.replace(/[\t\r\n ]+/g, " ");
  if (!("name" in n) || !("children" in n)) return null;
  if (n.name === "br") return "\n";
  if (n.name === "a") {
    const href = n.attribs.href ?? "";
    return (
      <Text
        key={i}
        accessibilityRole="link"
        style={css.link}
        onPress={() => {
          if (/^https?:\/\//.test(href))
            void Linking.openURL(href).catch(() => undefined);
        }}
      >
        {n.children.map(inline)}
      </Text>
    );
  }
  return (
    <Text
      key={i}
      style={[
        ["b", "strong"].includes(n.name) ? css.bold : null,
        ["i", "em"].includes(n.name) ? css.italic : null,
      ]}
    >
      {n.children.map(inline)}
    </Text>
  );
}
function render(n: Node, i: number): ReactNode {
  if (n.type === "text")
    return n.data.trim() ? (
      <Text key={i} selectable style={css.text}>
        {n.data}
      </Text>
    ) : null;
  if (
    !("name" in n) ||
    !("children" in n) ||
    ["script", "iframe", "style", "img"].includes(n.name)
  )
    return null;
  if (n.name === "table")
    return (
      <ScrollView
        key={i}
        horizontal
        accessibilityLabel="표, 가로로 스크롤할 수 있습니다"
      >
        <View>{n.children.map(render)}</View>
      </ScrollView>
    );
  if (n.name === "thead" || n.name === "tbody")
    return <View key={i}>{n.children.map(render)}</View>;
  if (n.name === "tr")
    return (
      <View key={i} style={css.row}>
        {n.children
          .filter((c) => "name" in c && ["th", "td"].includes(c.name))
          .map((c, j) => (
            <View key={j} style={css.cell}>
              <Text selectable style={css.text}>
                {"children" in c
                  ? c.children.map(inline)
                  : DomUtils.textContent(c)}
              </Text>
            </View>
          ))}
      </View>
    );
  if (n.name === "ol" || n.name === "ul")
    return (
      <View key={i} style={css.list}>
        {n.children
          .filter((c) => "name" in c && c.name === "li")
          .map((c, j) => (
            <View key={j} style={css.row}>
              <Text style={css.text}>
                {n.name === "ol" ? `${j + 1}.` : "•"}
              </Text>
              <View style={css.flex}>
                {"children" in c ? c.children.map(render) : null}
              </View>
            </View>
          ))}
      </View>
    );
  if (n.name === "blockquote")
    return (
      <View key={i} style={css.quote}>
        {n.children.map(render)}
      </View>
    );
  if (n.name === "hr") return <View key={i} style={css.rule} />;
  return (
    <Text key={i} selectable style={css.text}>
      {n.children.map(inline)}
    </Text>
  );
}
export function StoryMarkup({ html }: { html: string }) {
  const nodes = useMemo(() => parseDocument(html).children, [html]);
  return <View>{nodes.map(render)}</View>;
}
const css = StyleSheet.create({
  text: {
    fontFamily: "NaviSans",
    fontSize: 17,
    lineHeight: 30,
    color: "#d7dcdb",
    marginVertical: 6,
  },
  bold: { fontFamily: "NaviSansBold", fontWeight: "700", color: colors.text },
  italic: { fontStyle: "italic" },
  link: { color: "#ccff55", textDecorationLine: "underline" },
  row: { flexDirection: "row", gap: 12 },
  cell: { width: 180, padding: 12, borderWidth: 1, borderColor: colors.line },
  flex: { flex: 1 },
  list: { gap: 8, paddingLeft: 8 },
  quote: { padding: 20, backgroundColor: colors.surface },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 20 },
});
