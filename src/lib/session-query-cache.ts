import type { QueryClient } from "@tanstack/react-query";
import type { SessionChange } from "./session";

export async function synchronizeSessionQueries(
  client: QueryClient,
  change: SessionChange,
) {
  if (change !== "identity") return;
  // Removing observed queries strands mounted screens on their old pending query.
  // Drop inactive account data, but reset active queries and their observers together.
  client.getMutationCache().clear();
  client.removeQueries({ type: "inactive" });
  await client.resetQueries({ type: "active" });
}
