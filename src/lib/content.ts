import { parseDocument, DomUtils } from "htmlparser2";
export function plainText(html: string) {
  return DomUtils.textContent(
    parseDocument(html.replace(/<\/(p|div|li|h[1-6])>/gi, "\n")),
  ).trim();
}
export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function textHtml(value: string) {
  return value
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}
