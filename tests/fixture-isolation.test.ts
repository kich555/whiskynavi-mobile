import { afterEach, expect, it } from "vitest";
import { createFixtureGateway } from "../e2e/fixtures/server.mjs";
import type { Server } from "node:http";
let server: Server;
afterEach(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
it("parallel clients cannot reset or observe another client's seeded orders", async () => {
  server = createFixtureGateway();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const call = async (id: string, path: string, method = "GET") =>
    (
      await fetch(`http://127.0.0.1:${address.port}${path}`, {
        method,
        headers: {
          "X-E2E-Test-Id": id,
          Authorization: "Bearer fixture-access",
        },
      })
    ).json();
  await Promise.all([
    call("alpha", "/__test/seed-account", "POST"),
    call("beta", "/__test/reset", "POST"),
  ]);
  expect((await call("alpha", "/api/2.0/orders")).content).toHaveLength(2);
  expect((await call("beta", "/api/2.0/orders")).content).toHaveLength(1);
  await call("alpha", "/__test/dispose", "POST");
  expect((await call("alpha", "/api/2.0/orders")).content).toHaveLength(1);
});
