import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import routes from "../route-migration.json";
describe("migration route inventory", () => {
  it("has unique destination URLs", () =>
    expect(new Set(routes.map((route) => route.route)).size).toBe(
      routes.length,
    ));
  it.each(routes)("provides a native route for $route", ({ target }) => {
    expect(existsSync(target)).toBe(true);
    const source = readFileSync(target, "utf8");
    expect(source).not.toMatch(
      /next\/(link|navigation|image)|window\.|document\./,
    );
  });
  it("retains every requested source URL with the archive modal folded into detail", () => {
    const expected = JSON.parse(
      readFileSync("e2e/source-routes.json", "utf8"),
    ) as string[];
    expect(expected).toHaveLength(53);
    for (const path of expected)
      expect(
        routes.some((route) => route.route === path),
        path,
      ).toBe(true);
  });
});

it("keeps the generated API byte-for-byte consistent with its provenance", async () => {
  const { createHash } = await import("node:crypto");
  const provenance = JSON.parse(readFileSync("api-provenance.json", "utf8"));
  expect(
    createHash("sha256")
      .update(readFileSync("src/apis/generated/api.ts"))
      .digest("hex"),
  ).toBe(provenance.sha256);
});
