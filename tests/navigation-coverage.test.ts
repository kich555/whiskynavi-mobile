import { expect, it, vi } from "vitest";
import type { Page } from "@playwright/test";
import { checkpointNavigations } from "../e2e/web/navigation-coverage";

it("persists the outgoing document before navigation and restores original methods", async () => {
  let current = "about:blank";
  const recorded: string[] = [];
  const goto = vi.fn(async (url: string) => {
    current = url;
    return null;
  });
  const reload = vi.fn(async () => {
    current += "?reloaded";
    return null;
  });
  const page = {
    url: () => current,
    goto,
    reload,
    goBack: vi.fn(),
    goForward: vi.fn(),
  } as unknown as Page;
  const restore = checkpointNavigations(page, async () => {
    recorded.push(current);
  });
  await page.goto("http://local/first");
  expect(recorded).toEqual([]);
  await page.goto("http://local/second");
  await page.reload();
  expect(recorded).toEqual(["http://local/first", "http://local/second"]);
  restore();
  await page.goto("http://local/third");
  expect(recorded).toHaveLength(2);
});

it("refuses to navigate if persisting coverage fails", async () => {
  const goto = vi.fn();
  const page = {
    url: () => "http://local/first",
    goto,
    reload: vi.fn(),
    goBack: vi.fn(),
    goForward: vi.fn(),
  } as unknown as Page;
  checkpointNavigations(page, async () => {
    throw new Error("coverage write failed");
  });
  await expect(page.goto("http://local/second")).rejects.toThrow(
    "coverage write failed",
  );
  expect(goto).not.toHaveBeenCalled();
});
