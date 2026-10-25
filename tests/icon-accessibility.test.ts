import { createElement, type ReactNode } from "react";
import { createRequire } from "node:module";
const { renderToStaticMarkup } = createRequire(import.meta.url)(
  "react-dom/server",
) as { renderToStaticMarkup(node: ReactNode): string };
import { expect, it, vi } from "vitest";
import { decorativeIconAccessibility } from "../src/lib/icon-accessibility";

it("hides decorative SVGs on web without forwarding native-only props to DOM", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const markup = renderToStaticMarkup(
    createElement<Record<string, unknown>>(
      "svg",
      decorativeIconAccessibility("web"),
    ),
  );
  expect(markup).toContain('aria-hidden="true"');
  expect(error).not.toHaveBeenCalled();
  expect(markup).not.toContain("importantForAccessibility");
});
it("retains native screen-reader hiding", () => {
  for (const platform of ["ios", "android"])
    expect(decorativeIconAccessibility(platform)).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    });
});
