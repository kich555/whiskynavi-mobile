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

it("maps every current app route to an explicit browser readiness oracle", async () => {
  const { readdirSync } = await import("node:fs");
  const cases = JSON.parse(readFileSync("e2e/route-cases.json", "utf8")) as {
    target: string;
    route: string;
    expect: string;
  }[];
  const files = readdirSync("src/app", { recursive: true })
    .filter(
      (f) =>
        typeof f === "string" &&
        f.endsWith(".tsx") &&
        !f.split("/").at(-1)!.startsWith("_layout"),
    )
    .map((f) => `src/app/${f}`);
  expect(cases.map((c) => c.target).sort()).toEqual(files.sort());
  expect(new Set(cases.map((c) => c.route)).size).toBe(cases.length);
  expect(cases.every((c) => c.expect.length > 0)).toBe(true);
});
