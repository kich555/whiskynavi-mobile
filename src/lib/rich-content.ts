import { DomUtils, parseDocument } from "htmlparser2";
export type RichNode = ReturnType<typeof parseDocument>["children"][number];
const blockNames = new Set([
  "p",
  "div",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "img",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);
export function containsRichBlock(nodes: RichNode[]): boolean {
  return nodes.some(
    (node) =>
      "name" in node &&
      (blockNames.has(node.name) ||
        ("children" in node && containsRichBlock(node.children))),
  );
}
export function editorEmptyLines(node: RichNode): number | undefined {
  if (
    !("name" in node) ||
    !["p", "div"].includes(node.name) ||
    !("children" in node)
  )
    return;
  if (containsRichBlock(node.children) || DomUtils.textContent(node).trim())
    return;
  const breaks = (nodes: RichNode[]): number =>
    nodes.reduce(
      (count, child) =>
        count +
        ("name" in child && child.name === "br"
          ? 1
          : "children" in child
            ? breaks(child.children)
            : 0),
      0,
    );
  // A lone <br> is the editor's empty-paragraph placeholder, not two lines.
  return Math.max(1, breaks(node.children));
}
