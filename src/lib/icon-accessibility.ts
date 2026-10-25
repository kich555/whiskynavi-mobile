// SVG libraries forward props directly to the browser's <svg> element.
export function decorativeIconAccessibility(platform: string) {
  if (platform === "web") return { "aria-hidden": true as const };
  return {
    "aria-hidden": true as const,
    accessibilityElementsHidden: true as const,
    importantForAccessibility: "no-hide-descendants" as const,
  };
}
