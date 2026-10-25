import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { synchronizeSessionQueries } from "../src/lib/session-query-cache";

it("keeps mounted home and notice observers connected when credentials change during a request", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const finishes: ((value: string) => void)[] = [];
  let signedIn = false;
  const observers = ["home", "global-notices"].map(
    (key) =>
      new QueryObserver(client, {
        queryKey: [key],
        queryFn: () =>
          signedIn
            ? Promise.resolve("signed-in response")
            : new Promise<string>((resolve) => {
                finishes.push(resolve);
              }),
      }),
  );
  const subscriptions = observers.map((observer) =>
    observer.subscribe(() => {}),
  );
  try {
    signedIn = true;
    await synchronizeSessionQueries(client, "identity");
    finishes.forEach((finish) => finish("old guest response"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (const observer of observers) {
      expect(client.getQueryCache().getAll()).toContain(
        observer.getCurrentQuery(),
      );
      expect(observer.getCurrentResult().status).toBe("success");
      expect(observer.getCurrentResult().data).toBe("signed-in response");
    }
  } finally {
    subscriptions.forEach((unsubscribe) => unsubscribe());
    client.clear();
  }
});

it("removes inactive account data when identity changes", async () => {
  const client = new QueryClient();
  client.setQueryData(["orders"], { private: true });
  await synchronizeSessionQueries(client, "identity");
  expect(client.getQueryData(["orders"])).toBeUndefined();
  client.clear();
});

it("preserves active requests during restore and token rotation", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: 0 } },
  });
  let finish: (value: string) => void = () => {};
  const observer = new QueryObserver(client, {
    queryKey: ["home"],
    queryFn: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  });
  const unsubscribe = observer.subscribe(() => {});
  try {
    const query = observer.getCurrentQuery();
    await synchronizeSessionQueries(client, "restore");
    await synchronizeSessionQueries(client, "refresh");
    expect(client.getQueryCache().getAll()).toContain(query);
    finish("response");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(observer.getCurrentResult().data).toBe("response");
  } finally {
    unsubscribe();
    client.clear();
  }
});
