import { parseDocument } from "htmlparser2";
import { useMemo, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";
import { go, Photo, styles } from "./ui";
type DOMNode = ReturnType<typeof parseDocument>["children"][number];

function renderNode(node: DOMNode, key: number): ReactNode {
  if (node.type === "text")
    return node.data.trim() ? (
      <Text key={key} style={styles.text}>
        {node.data}
      </Text>
    ) : null;
  if (!("name" in node) || !("children" in node)) return null;
  if (
    ["script", "style", "iframe", "object", "embed", "form", "input"].includes(
      node.name,
    )
  )
    return null;
  if (node.name === "img")
    return /^https:\/\//.test(node.attribs.src ?? "") ? (
      <Photo
        key={key}
        uri={node.attribs.src}
        label={node.attribs.alt || "본문 이미지"}
      />
    ) : null;
  if (node.name === "br") return <Text key={key}>{"\n"}</Text>;
  if (node.name === "a") {
    const href = node.attribs.href;
    const text =
      node.children
        .filter((n) => n.type === "text")
        .map((n) => (n.type === "text" ? n.data : ""))
        .join("") || "링크 열기";
    return (
      <Text
        key={key}
        accessibilityRole="link"
        style={styles.link}
        onPress={() => {
          if (/^\/(?!\/)/.test(href)) go(href);
          else if (/^https?:\/\//.test(href)) void Linking.openURL(href);
        }}
      >
        {text}
      </Text>
    );
  }
  return (
    <View
      key={key}
      style={{
        gap: 8,
        marginVertical: ["p", "div", "li"].includes(node.name) ? 4 : 0,
      }}
    >
      {node.children.map(renderNode)}
    </View>
  );
}
export function RichContent({ html }: { html?: string }) {
  const nodes = useMemo(
    () => parseDocument(html ?? "", { decodeEntities: true }).children,
    [html],
  );
  return <View style={{ gap: 8 }}>{nodes.map(renderNode)}</View>;
}
