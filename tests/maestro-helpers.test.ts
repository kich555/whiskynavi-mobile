import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, test } from "vitest";

for (const file of readdirSync("e2e/maestro/helpers").filter((name) =>
  name.endsWith(".js"),
)) {
  test(`Maestro helper ${file} provides a loopback request body`, () => {
    const requests: string[] = [];
    runInNewContext(readFileSync(`e2e/maestro/helpers/${file}`, "utf8"), {
      json: JSON.parse,
      http: {
        get(url: string) {
          expect(url).toBe("http://127.0.0.1:8787/__test/state");
          return { status: 200, body: JSON.stringify({ unhandled: [] }) };
        },
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

test("native cleanup disposes owned data even when an unexpected API was called", () => {
  let disposed = false;
  expect(() =>
    runInNewContext(readFileSync("e2e/maestro/helpers/cleanup.js", "utf8"), {
      json: JSON.parse,
      http: {
        get: () => ({
          status: 200,
          body: JSON.stringify({ unhandled: ["GET /missing"] }),
        }),
        post: () => {
          disposed = true;
          return { status: 200 };
        },
      },
    }),
  ).toThrow("Unhandled native API requests");
  expect(disposed).toBe(true);
});
