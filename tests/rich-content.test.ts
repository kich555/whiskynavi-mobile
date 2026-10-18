import { describe, it, expect } from "vitest";
import { parseDocument } from "htmlparser2";
import { editorEmptyLines } from "../src/lib/rich-content";
const first = (html: string) => parseDocument(html).children[0];
describe("editor blank-line semantics", () => {
  it.each([
    "<p></p>",
    "<p><br></p>",
    "<p>&nbsp;</p>",
    "<p><span><br></span></p>",
    "<div><br></div>",
  ])("treats %s as one text line", (html) =>
    expect(editorEmptyLines(first(html))).toBe(1),
  );
  it("preserves intentional multiple empty lines", () =>
    expect(editorEmptyLines(first("<p><br><br></p>"))).toBe(2));
  it.each([
    "<p>첫 줄<br>둘째 줄</p>",
    "<p><img src='https://example.test/a.png'></p>",
    "<div><p><br></p></div>",
    "<p><strong>본문</strong></p>",
  ])("does not turn content or wrappers into spacer lines: %s", (html) =>
    expect(editorEmptyLines(first(html))).toBeUndefined(),
  );
});
