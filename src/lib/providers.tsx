import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { session } from "./session";
import { synchronizeSessionQueries } from "./session-query-cache";

const ReadyContext = createContext(false);
function SessionLifecycle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const client = useQueryClient();
  useEffect(() => {
    let active = true;
    session
      .restore()
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    const unsubscribe = session.subscribe((change) => {
      void synchronizeSessionQueries(client, change).catch(() => undefined);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void client.invalidateQueries();
    });
    return () => {
      active = false;
      unsubscribe();
      subscription.remove();
    };
  }, [client]);
  return <ReadyContext value={ready}>{children}</ReadyContext>;
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <SessionLifecycle>{children}</SessionLifecycle>
    </QueryClientProvider>
  );
}
export function useSession() {
  const ready = useContext(ReadyContext);
  const tokens = useSyncExternalStore(
    session.subscribe,
    session.get,
    () => null,
  );
  return { ready, tokens, signedIn: Boolean(tokens) };
}
