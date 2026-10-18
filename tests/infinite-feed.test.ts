import { describe, it, expect } from "vitest";
import { QueryClient, InfiniteQueryObserver } from "@tanstack/react-query";
import {
  nextFeedPage,
  uniqueFeedItems,
  type FeedPage,
} from "../src/lib/infinite-feed";
describe("infinite feed page contract", () => {
  it("keeps row identity while eliminating overlap between pages", () => {
    expect(
      uniqueFeedItems([
        { content: [{ id: 1 }, { id: 2 }] },
        { content: [{ id: 2 }, { id: 3 }] },
      ]),
    ).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
  it("stops on the final or empty page", () => {
    const first = { content: [{ id: 1 }], page: { totalPages: 2 } };
    expect(nextFeedPage(first, [first])).toBe(1);
    expect(nextFeedPage(first, [first, first])).toBeUndefined();
    expect(
      nextFeedPage({ content: [], page: { totalPages: 9 } }, [first]),
    ).toBeUndefined();
  });
  it("retains earlier pages after failure and retries the same offset", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let fail = true;
    const calls: number[] = [];
    const observer = new InfiniteQueryObserver(client, {
      queryKey: ["feed", "all"],
      initialPageParam: 0,
      queryFn: async ({ pageParam }): Promise<FeedPage<{ id: number }>> => {
        calls.push(pageParam);
        if (pageParam === 1 && fail) throw new Error("offline");
        return { content: [{ id: pageParam + 1 }], page: { totalPages: 2 } };
      },
      getNextPageParam: nextFeedPage<{ id: number }>,
    });
    const unsubscribe = observer.subscribe(() => {});
    await observer.refetch();
    await observer.fetchNextPage();
    expect(uniqueFeedItems(observer.getCurrentResult().data!.pages)).toEqual([
      { id: 1 },
    ]);
    expect(observer.getCurrentResult().isFetchNextPageError).toBe(true);
    fail = false;
    await observer.fetchNextPage();
    expect(uniqueFeedItems(observer.getCurrentResult().data!.pages)).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    expect(calls).toEqual([0, 1, 1]);
    unsubscribe();
    client.clear();
  });
});
