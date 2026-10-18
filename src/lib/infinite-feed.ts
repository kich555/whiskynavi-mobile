import {
  useInfiniteQuery,
  useQueryClient,
  type QueryKey,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo, useRef } from "react";

export type FeedPage<T> = {
  content?: T[];
  page?: { totalPages?: number; totalElements?: number };
};

export function nextFeedPage<T>(last: FeedPage<T>, pages: FeedPage<T>[]) {
  return last.content?.length && pages.length < (last.page?.totalPages ?? 0)
    ? pages.length
    : undefined;
}
export function uniqueFeedItems<T extends { id?: number }>(
  pages: FeedPage<T>[],
): T[] {
  const seen = new Set<number>();
  return pages
    .flatMap((page) => page.content ?? [])
    .filter((item) => {
      if (item.id == null) return true;
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

// Each filter/resource has its own cache. Page responses never replace earlier rows.
export function useInfiniteFeed<T extends { id?: number }>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: QueryKey;
  queryFn: (page: number) => Promise<FeedPage<T>>;
  enabled?: boolean;
}) {
  const client = useQueryClient();
  const lock = useRef(false);
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    getNextPageParam: nextFeedPage<T>,
  });
  const items = useMemo(
    () => uniqueFeedItems(query.data?.pages ?? []),
    [query.data],
  );
  const loadMore = async () => {
    if (lock.current || query.isFetching || !query.hasNextPage) return;
    lock.current = true;
    try {
      await query.fetchNextPage({ cancelRefetch: false });
    } finally {
      lock.current = false;
    }
  };
  const refresh = () => {
    client.setQueryData<InfiniteData<FeedPage<T>>>(queryKey, (data) =>
      data
        ? {
            pages: data.pages.slice(0, 1),
            pageParams: data.pageParams.slice(0, 1),
          }
        : data,
    );
    void query.refetch({ cancelRefetch: true });
  };
  return {
    ...query,
    items,
    total: query.data?.pages[0]?.page?.totalElements ?? 0,
    feed: {
      items,
      hasNext: Boolean(query.hasNextPage),
      loading: query.isPending && enabled,
      refreshing: query.isRefetching && !query.isFetchingNextPage,
      loadingMore: query.isFetchingNextPage,
      error: query.isFetchNextPageError ? null : query.error,
      nextError: query.isFetchNextPageError ? query.error : null,
      loadMore: () => {
        void loadMore();
      },
      refresh,
    },
  };
}
