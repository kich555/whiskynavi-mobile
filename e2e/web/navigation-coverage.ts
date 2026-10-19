import type { Page } from "@playwright/test";

/** Persist coverage before Chromium discards a previous document's context. */
export function checkpointNavigations(
  page: Page,
  checkpoint: () => Promise<void>,
) {
  const original = {
    goto: page.goto.bind(page),
    reload: page.reload.bind(page),
    goBack: page.goBack.bind(page),
    goForward: page.goForward.bind(page),
  };
  function wrap<Args extends unknown[], Result>(
    method: (...args: Args) => Promise<Result>,
  ) {
    return async (...args: Args): Promise<Result> => {
      if (page.url() !== "about:blank") await checkpoint();
      return method(...args);
    };
  }
  page.goto = wrap(original.goto);
  page.reload = wrap(original.reload);
  page.goBack = wrap(original.goBack);
  page.goForward = wrap(original.goForward);
  return () => Object.assign(page, original);
}
