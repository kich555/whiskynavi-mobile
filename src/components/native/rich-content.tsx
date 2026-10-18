import { parseDocument, DomUtils } from "htmlparser2";
import { useMemo, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import {
  containsRichBlock,
  editorEmptyLines,
  type RichNode,
} from "@/lib/rich-content";
import { go, Photo, styles } from "./ui";
const hidden = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
]);
function openLink(href: string) {
  if (/^\/(?!\/)/.test(href)) go(href);
  else if (/^https?:\/\//.test(href)) void Linking.openURL(href);
}
function inline(node: RichNode, key: number): ReactNode {
  if (node.type === "text") return node.data.replace(/[\t\r\n ]+/g, " ");
  if (!("name" in node) || !("children" in node) || hidden.has(node.name))
    return null;
  if (node.name === "br") return "\n";
  if (node.name === "a")
    return (
      <Text
        key={key}
        accessibilityRole="link"
        style={{ color: "#fcd34d", textDecorationLine: "underline" }}
        onPress={() => openLink(node.attribs.href ?? "")}
      >
        {node.children.map(inline)}
      </Text>
    );
  return (
    <Text
      key={key}
      style={[
        ["strong", "b"].includes(node.name)
          ? { fontFamily: "NaviSansBold", fontWeight: "700" }
          : null,
        ["em", "i"].includes(node.name) ? { fontStyle: "italic" } : null,
        node.name === "u" ? { textDecorationLine: "underline" } : null,
        ["s", "del"].includes(node.name)
          ? { textDecorationLine: "line-through" }
          : null,
      ]}
    >
      {node.children.map(inline)}
    </Text>
  );
}
function renderNode(node: RichNode, key: number): ReactNode {
  if (node.type === "text")
    return node.data.trim() ? (
      <Text key={key} selectable style={styles.text}>
        {node.data}
      </Text>
    ) : null;
  if (!("name" in node) || !("children" in node) || hidden.has(node.name))
    return null;
  if (node.name === "img")
    return /^https:\/\//.test(node.attribs.src ?? "") ? (
      <Photo
        key={key}
        uri={node.attribs.src}
        label={node.attribs.alt || "본문 이미지"}
      />
    ) : null;
  const blank = editorEmptyLines(node);
  if (blank != null || node.name === "br")
    return (
      <Text
        key={key}
        testID="rich-empty-line"
        accessible={false}
        style={styles.text}
      >
        {"\n".repeat(Math.max(0, (blank ?? 1) - 1)) + "\u00a0"}
      </Text>
    );
  if (node.name === "pre")
    return (
      <Text
        key={key}
        selectable
        style={[
          styles.text,
          {
            fontFamily: "monospace",
            padding: 12,
            backgroundColor: "#00000025",
          },
        ]}
      >
        {DomUtils.textContent(node)}
      </Text>
    );
  if (node.name === "hr")
    return (
      <View
        key={key}
        style={{ height: 1, backgroundColor: "#ffffff1a", marginVertical: 12 }}
      />
    );
  if (node.name === "ul" || node.name === "ol") {
    let index = 0;
    return (
      <View key={key}>
        {node.children.map((child, i) =>
          "name" in child && child.name === "li" ? (
            <View
              key={i}
              style={{ flexDirection: "row", gap: 8, paddingLeft: 8 }}
            >
              <Text style={styles.text}>
                {node.name === "ol" ? `${++index}.` : "•"}
              </Text>
              <View style={{ flex: 1 }}>{renderNode(child, i)}</View>
            </View>
          ) : (
            renderNode(child, i)
          ),
        )}
      </View>
    );
  }
  if (
    containsRichBlock(node.children) ||
    ["ul", "ol", "blockquote"].includes(node.name)
  )
    return (
      <View
        key={key}
        style={
          node.name === "blockquote"
            ? {
                borderLeftWidth: 2,
                borderLeftColor: "#ffffff40",
                paddingLeft: 12,
                marginVertical: 8,
              }
            : node.name === "ul" || node.name === "ol"
              ? { paddingLeft: 16 }
              : undefined
        }
      >
        {node.children.map(renderNode)}
      </View>
    );
  return (
    <Text
      key={key}
      selectable
      accessibilityRole={/^h[1-6]$/.test(node.name) ? "header" : undefined}
      style={[
        styles.text,
        /^h[1-6]$/.test(node.name)
          ? {
              fontFamily: "NaviSansBold",
              fontSize: node.name === "h1" ? 24 : node.name === "h2" ? 20 : 18,
              lineHeight: node.name === "h1" ? 32 : 28,
              marginTop: 12,
              marginBottom: 8,
            }
          : null,
      ]}
    >
      {node.children.map(inline)}
    </Text>
  );
}
export function RichContent({ html }: { html?: string }) {
  const nodes = useMemo(
    () => parseDocument(html ?? "", { decodeEntities: true }).children,
    [html],
  );
  return <View testID="rich-content">{nodes.map(renderNode)}</View>;
}
