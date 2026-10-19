import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

for (const file of readdirSync("e2e/maestro/helpers").filter((name) =>
  name.endsWith(".js"),
)) {
  test(`Maestro helper ${file} provides a loopback request body`, () => {
    const requests: string[] = [];
    runInNewContext(readFileSync(`e2e/maestro/helpers/${file}`, "utf8"), {
      http: {
        post(url: string, config: { body?: string } = {}) {
          expect(new URL(url).origin).toBe("http://127.0.0.1:8787");
          expect(typeof config.body).toBe("string");
          expect(() => JSON.parse(config.body!)).not.toThrow();
          requests.push(url);
          return { status: 200 };
        },
      },
    });
    expect(requests.length).toBeGreaterThan(0);
  });
}
