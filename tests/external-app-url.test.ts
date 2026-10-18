import { describe, it, expect } from "vitest";
import { externalAppUrl } from "../src/lib/external-app-url";
describe("provider app switching", () => {
  it("converts Android Intent URLs into card-app schemes", () =>
    expect(
      externalAppUrl(
        "intent://pay?token=synthetic#Intent;scheme=kakaotalk;package=com.kakao.talk;end",
      ),
    ).toBe("kakaotalk://pay?token=synthetic"));
  it("preserves existing app schemes", () =>
    expect(externalAppUrl("ispmobile://pay")).toBe("ispmobile://pay"));
  it.each([
    "javascript:alert(1)",
    "file:///private",
    "data:text/html,test",
    "intent://pay#Intent;scheme=javascript;end",
    "intent://pay#Intent;package=unknown;end",
  ])("rejects unsafe or incomplete URL %s", (value) =>
    expect(() => externalAppUrl(value)).toThrow(),
  );
});
